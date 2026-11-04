import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShutdownHandler, type ShutdownServer } from './shutdown.js';

const TIMEOUT_MS = 1_000;

type CloseCallback = (err?: Error) => void;

/** Records the order of server/mongo/exit calls so sequencing can be asserted. */
function createFakes(options: { closeCallsBack?: boolean; disconnectError?: Error } = {}) {
  const { closeCallsBack = true, disconnectError } = options;
  const calls: string[] = [];

  const server = {
    close: vi.fn((cb?: CloseCallback) => {
      calls.push('close');
      if (closeCallsBack) {
        cb?.();
      }
      return server;
    }),
    closeIdleConnections: vi.fn(() => {
      calls.push('closeIdleConnections');
    }),
    closeAllConnections: vi.fn(() => {
      calls.push('closeAllConnections');
    }),
  };

  const mongo = {
    disconnect: vi.fn((): Promise<void> => {
      calls.push('disconnect');
      return disconnectError ? Promise.reject(disconnectError) : Promise.resolve();
    }),
  };

  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const exit = vi.fn((code: number) => {
    calls.push(`exit:${code}`);
  });

  const shutdown = createShutdownHandler({
    server: server as unknown as ShutdownServer,
    mongo,
    logger: logger as never,
    timeoutMs: TIMEOUT_MS,
    exit,
  });

  return { calls, server, mongo, logger, exit, shutdown };
}

describe('createShutdownHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('closes the server before disconnecting mongo, then exits with the given code', async () => {
    const { calls, exit, shutdown } = createFakes();

    await shutdown('SIGTERM', 0);

    expect(calls.indexOf('close')).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf('close')).toBeLessThan(calls.indexOf('disconnect'));
    expect(calls[calls.length - 1]).toBe('exit:0');
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('ignores a second shutdown call', async () => {
    const { server, mongo, exit, shutdown } = createFakes();

    await shutdown('SIGTERM', 0);
    await shutdown('SIGINT', 0);

    expect(server.close).toHaveBeenCalledTimes(1);
    expect(mongo.disconnect).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('destroys remaining connections and exits 1 when the timeout expires', async () => {
    const { server, mongo, exit, logger, shutdown } = createFakes({ closeCallsBack: false });

    // close() never calls back, so this promise stays pending.
    void shutdown('SIGTERM', 0);

    await vi.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
    expect(exit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(server.closeAllConnections).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(mongo.disconnect).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('logs a disconnect rejection and exits with code 1', async () => {
    const error = new Error('mongo down');
    const { exit, logger, shutdown } = createFakes({ disconnectError: error });

    await shutdown('SIGTERM', 0);

    expect(logger.error).toHaveBeenCalledWith(
      { err: error },
      'error while disconnecting from mongo',
    );
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
