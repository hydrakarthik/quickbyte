import type { RequestHandler } from 'express';
import { AppError } from '../../lib/app-error.js';

/** Mounted after all routers so unknown routes flow through the central error handler. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.path} not found`));
};
