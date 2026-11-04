import mongoose, { type Mongoose } from 'mongoose';
import type { Logger } from 'pino';

/** Connection state exposed to readiness checks. */
export type DbState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';

export interface MongoConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getState(): DbState;
  isReady(): boolean;
}

export interface MongoConnectionOptions {
  uri: string;
  serverSelectionTimeoutMS: number;
  logger: Logger;
  /** Injected in tests; defaults to the mongoose default export. */
  client?: Pick<Mongoose, 'connect' | 'disconnect' | 'connection'>;
}

/**
 * Maps a Mongoose `connection.readyState` value to a DbState.
 * 0 disconnected, 1 connected, 2 connecting, 3 disconnecting; anything else
 * (including 99 uninitialized) maps to disconnected.
 */
export function mapReadyState(readyState: number): DbState {
  switch (readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}

const SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//;
const REDACTED = '***';

/**
 * Returns the URI with the userinfo password replaced by `***`.
 * Hosts, path, and options are kept so logs stay useful. Input that does not
 * look like a URI is fully redacted, since it may itself be a secret.
 */
export function redactMongoUri(uri: string): string {
  const schemeMatch = SCHEME_PATTERN.exec(uri);
  if (!schemeMatch) {
    return REDACTED;
  }
  const scheme = schemeMatch[0];
  const rest = uri.slice(scheme.length);

  // The authority ends at the first '/', '?', or '#'. Userinfo ends at the
  // last '@' inside the authority (hosts never contain '@').
  const authEndMatch = /[/?#]/.exec(rest);
  const authEnd = authEndMatch ? authEndMatch.index : rest.length;
  let at = rest.lastIndexOf('@', authEnd - 1);
  if (at >= authEnd) {
    at = -1;
  }
  if (at === -1 && rest.includes('@')) {
    // An unencoded '/', '?', or '#' inside the password shifts the apparent
    // authority end. Fail safe: treat everything up to the last '@' as userinfo.
    at = rest.lastIndexOf('@');
  }
  if (at === -1) {
    return uri;
  }

  const userinfo = rest.slice(0, at);
  const afterUserinfo = rest.slice(at);
  const colon = userinfo.indexOf(':');
  if (colon === -1) {
    // Username only (for example X.509); nothing secret to hide.
    return uri;
  }
  return `${scheme}${userinfo.slice(0, colon)}:${REDACTED}${afterUserinfo}`;
}

export function createMongoConnection(options: MongoConnectionOptions): MongoConnection {
  const { uri, serverSelectionTimeoutMS, logger } = options;
  const client = options.client ?? mongoose;
  const db = { host: redactMongoUri(uri) };
  const log = logger.child({ component: 'mongo' });

  const connection = client.connection;
  connection.on('connected', () => {
    log.info({ db }, 'mongo connected');
  });
  connection.on('disconnected', () => {
    log.warn({ db }, 'mongo disconnected');
  });
  connection.on('reconnected', () => {
    log.info({ db }, 'mongo reconnected');
  });
  connection.on('error', (err: unknown) => {
    log.error({ db, err }, 'mongo connection error');
  });

  let inFlight: Promise<void> | null = null;

  const getState = (): DbState => mapReadyState(client.connection.readyState);

  return {
    connect(): Promise<void> {
      if (getState() === 'connected') {
        return Promise.resolve();
      }
      if (inFlight) {
        return inFlight;
      }
      inFlight = client
        .connect(uri, { serverSelectionTimeoutMS })
        .then(() => undefined)
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },

    async disconnect(): Promise<void> {
      if (getState() === 'disconnected') {
        return;
      }
      await client.disconnect();
    },

    getState,

    isReady(): boolean {
      return getState() === 'connected';
    },
  };
}
