import type { Server } from 'node:http';
import type { Logger } from 'pino';
import type { MongoConnection } from '../db/mongo.js';

/** The subset of `http.Server` the shutdown sequence uses; easy to fake in tests. */
export type ShutdownServer = Pick<Server, 'close' | 'closeIdleConnections' | 'closeAllConnections'>;

export interface ShutdownHandlerOptions {
  server: ShutdownServer;
  mongo: Pick<MongoConnection, 'disconnect'>;
  logger: Pick<Logger, 'info' | 'warn' | 'error'>;
  /** Maximum time for the graceful sequence before sockets are destroyed. */
  timeoutMs: number;
  /** Injected so tests can assert exit codes; `server.ts` passes `process.exit`. */
  exit: (code: number) => void;
}

/**
 * Starts a graceful shutdown. Never rejects; every outcome ends in exactly one
 * `exit` call.
 */
export type ShutdownFn = (reason: string, exitCode: number) => Promise<void>;

/** Resolves once the server has stopped accepting connections and all sockets closed. */
function closeServer(server: ShutdownServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
    // Drop idle keep-alive sockets so close() is not held open by them.
    server.closeIdleConnections();
  });
}

export function createShutdownHandler(options: ShutdownHandlerOptions): ShutdownFn {
  const { server, mongo, logger, timeoutMs, exit } = options;
  let shuttingDown = false;
  let exited = false;

  // Guards against a late completion calling exit again after the timeout fired.
  const exitOnce = (code: number): void => {
    if (exited) {
      return;
    }
    exited = true;
    exit(code);
  };

  return async function shutdown(reason: string, exitCode: number): Promise<void> {
    // 1. A second signal does not restart the sequence.
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    // 2.
    logger.info({ reason, exitCode }, 'shutting down');

    // 3. The timer is intentionally not unref'd: if a pending step leaves no
    // other handle alive, Node would otherwise exit with code 0 on its own,
    // losing a non-zero exitCode. It is always cleared on completion.
    const timer = setTimeout(() => {
      logger.error({ reason, timeoutMs }, 'shutdown timed out; destroying remaining connections');
      server.closeAllConnections();
      exitOnce(1);
    }, timeoutMs);

    let finalCode = exitCode;

    // 4. Stop accepting connections and drain keep-alive sockets.
    try {
      await closeServer(server);
    } catch (err: unknown) {
      logger.error({ err }, 'error while closing http server');
      finalCode = 1;
    }

    // 5. Only after the server has closed.
    try {
      await mongo.disconnect();
    } catch (err: unknown) {
      logger.error({ err }, 'error while disconnecting from mongo');
      finalCode = 1;
    }

    // 6.
    clearTimeout(timer);
    if (!exited) {
      logger.info({ reason, exitCode: finalCode }, 'shutdown complete');
    }
    exitOnce(finalCode);
  };
}
