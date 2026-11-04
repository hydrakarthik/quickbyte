import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError, type ErrorDetail } from '../../lib/app-error.js';

/** Request locations that can be validated. */
export type Location = 'body' | 'query' | 'params';

/** Zod schemas keyed by request location; omitted locations are not validated. */
export type RequestSchemas = Partial<Record<Location, ZodType>>;

declare module 'express-serve-static-core' {
  interface Request {
    /** Parsed output of the `validate` middleware, keyed by location. */
    validated?: Partial<Record<Location, unknown>>;
  }
}

/** Order in which locations are validated; also the order of reported details. */
const LOCATIONS = ['params', 'query', 'body'] as const satisfies ReadonlyArray<Location>;

/** Joins a Zod issue path with `.`; symbols are stringified so `join` cannot throw. */
function formatPath(path: ReadonlyArray<PropertyKey>): string {
  return path.map((segment) => String(segment)).join('.');
}

/**
 * Validates the provided request locations against Zod schemas.
 *
 * Every provided location is checked before responding, so a client sees all
 * invalid fields at once. On failure, forwards `AppError.validation(details)`.
 * On success, sets `req.validated` and replaces `req.body` with the parsed body.
 * `req.query` is not reassigned because it is a getter in Express 5.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const details: ErrorDetail[] = [];
    const validated: Partial<Record<Location, unknown>> = {};

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;
      const result = schema.safeParse(req[location]);
      if (result.success) {
        validated[location] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ location, path: formatPath(issue.path), message: issue.message });
        }
      }
    }

    if (details.length > 0) {
      next(AppError.validation(details));
      return;
    }

    req.validated = validated;
    if ('body' in validated) req.body = validated.body;
    next();
  };
}
