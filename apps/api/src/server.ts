import { existsSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from './app.js';
import { EnvValidationError, loadEnv, type Env } from './config/env.js';
import { createMongoConnection, redactMongoUri } from './db/mongo.js';
import { createLogger } from './lib/logger.js';
import { createShutdownHandler } from './lib/shutdown.js';

const exit = (code: number): never => process.exit(code);

/**
 * Loads `./.env` when present (existing environment variables win, because
 * `loadEnvFile` does not overwrite them), then validates the environment.
 * On invalid configuration prints only variable names and messages, never values.
 */
function readEnv(): Env {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  try {
    return loadEnv(process.env);
  } catch (err: unknown) {
    if (err instanceof EnvValidationError) {
      const lines = err.issues.map((issue) => `  ${issue.variable}: ${issue.message}`);
      process.stderr.write(`Invalid environment configuration:\n${lines.join('\n')}\n`);
      return exit(1);
    }
    throw err;
  }
}

/** Replaces any occurrence of the raw URI in a driver error message with its redacted form. */
function scrubMessage(message: string, uri: string, redacted: string): string {
  return message.split(uri).join(redacted);
}

function formatAddress(server: Server, fallbackHost: string, fallbackPort: number): string {
  const address: AddressInfo | string | null = server.address();
  if (address && typeof address === 'object') {
    const { address: host, port, family } = address;
    return family === 'IPv6' ? `[${host}]:${String(port)}` : `${host}:${String(port)}`;
  }
  return typeof address === 'string' ? address : `${fallbackHost}:${String(fallbackPort)}`;
}

async function main(): Promise<void> {
  const env = readEnv();
  const logger = createLogger({ level: env.LOG_LEVEL });
  const redactedHost = redactMongoUri(env.MONGODB_URI);

  const mongo = createMongoConnection({
    uri: env.MONGODB_URI,
    serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    logger,
  });

  try {
    await mongo.connect();
  } catch (err: unknown) {
    // Log a sanitized summary rather than the raw error, which may embed the URI.
    const name = err instanceof Error ? err.name : 'Error';
    const message = err instanceof Error ? err.message : String(err);
    logger.fatal(
      {
        db: { host: redactedHost },
        err: { name, message: scrubMessage(message, env.MONGODB_URI, redactedHost) },
      },
      'failed to connect to mongo',
    );
    exit(1);
  }

  const app = createApp({ logger, getDbState: () => mongo.getState() });
  const server = createServer(app);

  const shutdown = createShutdownHandler({
    server,
    mongo,
    logger,
    timeoutMs: env.SHUTDOWN_TIMEOUT_MS,
    exit,
  });

  server.on('error', (err) => {
    logger.fatal({ err, host: env.HOST, port: env.PORT }, 'http server error');
    void shutdown('serverError', 1);
  });

  server.listen(env.PORT, env.HOST, () => {
    logger.info(
      { address: formatAddress(server, env.HOST, env.PORT), nodeEnv: env.NODE_ENV },
      'http server listening',
    );
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT', 0);
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM', 0);
  });
  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal({ err: reason }, 'unhandledRejection');
    void shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (err: Error) => {
    logger.fatal({ err }, 'uncaughtException');
    void shutdown('uncaughtException', 1);
  });
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal startup error: ${err instanceof Error ? err.name : 'Error'}\n`);
  exit(1);
});
