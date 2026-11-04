import express, { type Express } from 'express';
import type { Logger } from 'pino';
import type { DbState } from './db/mongo.js';
import { errorHandler } from './http/middleware/error-handler.js';
import { notFoundHandler } from './http/middleware/not-found.js';
import { createRequestLogger } from './http/middleware/request-logger.js';
import { createHealthRouter } from './http/routes/health.js';

export interface AppDeps {
  logger: Logger;
  getDbState: () => DbState;
}

/**
 * Builds the Express app. Does not listen, connect to MongoDB, or read `process.env`,
 * so tests can construct it with a silent logger and a stubbed `getDbState`.
 */
export function createApp({ logger, getDbState }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(createRequestLogger(logger));
  app.use(express.json({ limit: '100kb' }));
  app.use(createHealthRouter({ getDbState }));
  // Phase 2+: app.use('/api/v1/<module>', <module>Router(deps))
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
