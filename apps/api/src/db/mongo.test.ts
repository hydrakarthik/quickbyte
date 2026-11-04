import { EventEmitter } from 'node:events';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '../lib/logger.js';
import {
  createMongoConnection,
  mapReadyState,
  redactMongoUri,
  type DbState,
  type MongoConnectionOptions,
} from './mongo.js';

// Fake Mongoose client: connect/disconnect are spies and the connection is an
// EventEmitter with a mutable readyState, so every branch runs without a database.
class FakeConnection extends EventEmitter {
  readyState = 0;
}

function createFakeClient() {
  const connection = new FakeConnection();
  const client = {
    connect: vi.fn(),
    disconnect: vi.fn(() => Promise.resolve()),
    connection,
  };
  return { client, connection };
}

// Captures pino output in memory, one JSON string per log line.
function createCapturingLogger() {
  const lines: string[] = [];
  const logger = createLogger({
    level: 'debug',
    destination: {
      write(chunk: string) {
        lines.push(chunk);
      },
    },
  });
  return { logger, lines };
}

function buildConnection(uri: string) {
  const { client, connection } = createFakeClient();
  const { logger, lines } = createCapturingLogger();
  const mongo = createMongoConnection({
    uri,
    serverSelectionTimeoutMS: 5000,
    logger,
    client: client as unknown as NonNullable<MongoConnectionOptions['client']>,
  });
  return { mongo, client, connection, lines };
}

const EXPECTED_STATES: Record<number, DbState> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

// Generators for credential-bearing URIs. Hosts, usernames, and paths use only
// lowercase characters; passwords always start with the uppercase marker
// "SECRET-", so a password can never be a substring of any other URI part.
const label = fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/);
const hostname = fc
  .array(label, { minLength: 1, maxLength: 3 })
  .map((labels) => [...labels, 'example', 'net'].join('.'));
const username = fc.stringMatching(/^[a-z][a-z0-9]{0,11}$/);
const password = fc
  .string({ minLength: 4, maxLength: 24 })
  .map((raw) => `SECRET-${encodeURIComponent(raw)}`);
const dbPath = fc.option(label.map((name) => `/${name}`), { nil: '' });
const query = fc.constantFrom('', '?retryWrites=true&w=majority', '?authSource=admin');

const standardUri = fc
  .record({
    hosts: fc.array(
      fc.tuple(hostname, fc.integer({ min: 1024, max: 65535 })).map(([h, p]) => `${h}:${p}`),
      { minLength: 1, maxLength: 3 },
    ),
    user: username,
    pass: password,
    path: dbPath,
    q: query,
  })
  .map(({ hosts, user, pass, path, q }) => ({
    uri: `mongodb://${user}:${pass}@${hosts.join(',')}${path}${q}`,
    host: hosts.join(','),
    user,
    pass,
  }));

const srvUri = fc
  .record({ host: hostname, user: username, pass: password, path: dbPath, q: query })
  .map(({ host, user, pass, path, q }) => ({
    uri: `mongodb+srv://${user}:${pass}@${host}${path}${q}`,
    host,
    user,
    pass,
  }));

describe('mapReadyState', () => {
  it('Feature: quickbyte-food-delivery, Property 8: Readiness reflects database state (readyState mapping)', () => {
    fc.assert(
      fc.property(fc.integer(), (readyState) => {
        const expected = EXPECTED_STATES[readyState] ?? 'disconnected';
        expect(mapReadyState(readyState)).toBe(expected);
      }),
      { numRuns: 200 },
    );
  });

  it('maps the Mongoose uninitialized state 99 to disconnected', () => {
    expect(mapReadyState(99)).toBe('disconnected');
  });
});

describe('redactMongoUri', () => {
  it('Feature: quickbyte-food-delivery, Property 3: Secrets are redacted from logs', () => {
    fc.assert(
      fc.property(fc.oneof(standardUri, srvUri), ({ uri, host, user, pass }) => {
        const redacted = redactMongoUri(uri);
        expect(redacted).not.toContain(pass);
        expect(redacted).toContain(host);
        expect(redacted).toContain(`${user}:***@${host}`);
      }),
      { numRuns: 200 },
    );
  });

  it('leaves URIs without credentials unchanged', () => {
    expect(redactMongoUri('mongodb://localhost:27017/quickbyte')).toBe(
      'mongodb://localhost:27017/quickbyte',
    );
  });
});

describe('createMongoConnection', () => {
  const uri = 'mongodb://appuser:SECRET-p4ss@db.example.net:27017/quickbyte';

  it('shares one client.connect call across concurrent connect() calls', async () => {
    const { mongo, client, connection } = buildConnection(uri);
    let resolveConnect!: () => void;
    client.connect.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveConnect = resolve;
        }),
    );

    const first = mongo.connect();
    const second = mongo.connect();
    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.connect).toHaveBeenCalledWith(uri, { serverSelectionTimeoutMS: 5000 });

    connection.readyState = 1;
    resolveConnect();
    await Promise.all([first, second]);

    await mongo.connect();
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('does not call client.disconnect when already disconnected', async () => {
    const { mongo, client, connection } = buildConnection(uri);
    connection.readyState = 0;

    await mongo.disconnect();
    expect(client.disconnect).not.toHaveBeenCalled();

    connection.readyState = 1;
    await mongo.disconnect();
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it('reports isReady() true only when connected', () => {
    const { mongo, connection } = buildConnection(uri);
    for (const readyState of [0, 1, 2, 3, 99]) {
      connection.readyState = readyState;
      expect(mongo.isReady()).toBe(readyState === 1);
      expect(mongo.getState()).toBe(mapReadyState(readyState));
    }
  });

  it('logs connection events with the redacted host and never the password', () => {
    const { connection, lines } = buildConnection(uri);

    connection.emit('connected');
    connection.emit('disconnected');
    connection.emit('reconnected');
    connection.emit('error', new Error('server selection timed out'));

    expect(lines).toHaveLength(4);
    const records = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(records.map((r) => r.msg)).toEqual([
      'mongo connected',
      'mongo disconnected',
      'mongo reconnected',
      'mongo connection error',
    ]);
    for (const record of records) {
      expect(record.component).toBe('mongo');
      expect(record.db).toEqual({ host: redactMongoUri(uri) });
    }
    const output = lines.join('');
    expect(output).toContain('db.example.net:27017');
    expect(output).not.toContain('SECRET-p4ss');
  });
});
