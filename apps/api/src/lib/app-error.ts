/**
 * Application error codes returned in the `error.code` field of API responses.
 * Later modules add domain codes here as needed; Phase 1 adds none.
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'PAYLOAD_TOO_LARGE'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

/** A single field-level problem, for example one failed validation rule. */
export interface ErrorDetail {
  location?: 'body' | 'query' | 'params';
  path: string;
  message: string;
}

/** An error with an HTTP status and a stable code, mapped to a response by the error handler. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ReadonlyArray<ErrorDetail>,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'AppError';
  }

  /** 4xx messages are written for clients; 5xx messages are internal. */
  get expose(): boolean {
    return this.statusCode < 500;
  }

  static validation(details: ReadonlyArray<ErrorDetail>): AppError {
    return new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }
}
