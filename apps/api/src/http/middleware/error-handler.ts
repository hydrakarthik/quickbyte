import type { ErrorRequestHandler } from 'express';
// Type-only import so pino-http's `req.log` / `req.id` augmentation is always in scope.
import type {} from 'pino-http';
import { AppError, type ErrorCode, type ErrorDetail } from '../../lib/app-error.js';

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
    requestId: string;
  };
}

interface MappedError {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: ErrorDetail[];
}

const INTERNAL_MESSAGE = 'Internal server error';
const UNAVAILABLE_MESSAGE = 'Service unavailable';

/** Reads the `type` set by body-parser on its errors, if present. */
function bodyParserType(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'type' in err) {
    return typeof err.type === 'string' ? err.type : undefined;
  }
  return undefined;
}

/** Maps any thrown value to a client-safe status, code, and message. */
function mapError(err: unknown): MappedError {
  if (err instanceof AppError) {
    if (err.expose) {
      const mapped: MappedError = { statusCode: err.statusCode, code: err.code, message: err.message };
      if (err.details && err.details.length > 0) mapped.details = [...err.details];
      return mapped;
    }
    return {
      statusCode: err.statusCode,
      code: err.code,
      message: err.statusCode === 503 ? UNAVAILABLE_MESSAGE : INTERNAL_MESSAGE,
    };
  }

  switch (bodyParserType(err)) {
    case 'entity.parse.failed':
      return { statusCode: 400, code: 'INVALID_JSON', message: 'Malformed JSON body' };
    case 'entity.too.large':
      return { statusCode: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' };
    default:
      return { statusCode: 500, code: 'INTERNAL_ERROR', message: INTERNAL_MESSAGE };
  }
}

function requestIdOf(id: unknown): string {
  if (typeof id === 'string') return id;
  if (typeof id === 'number') return String(id);
  return '';
}

/** Central error handler: one consistent JSON error shape, no internals leaked for 5xx. */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const mapped = mapError(err);
  const requestId = requestIdOf(req.id);

  if (mapped.statusCode >= 500) {
    // pino's `err` serializer includes the stack.
    req.log.error({ err, requestId, code: mapped.code }, 'request failed');
  } else {
    req.log.warn(
      {
        requestId,
        code: mapped.code,
        err: { type: err instanceof Error ? err.name : typeof err, message: mapped.message },
      },
      'request rejected',
    );
  }

  const body: ErrorResponse = {
    error: { code: mapped.code, message: mapped.message, requestId },
  };
  if (mapped.details) body.error.details = mapped.details;

  res.status(mapped.statusCode).json(body);
};
