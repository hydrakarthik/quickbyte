import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http';
import type { LevelWithSilent, Logger } from 'pino';
import { pinoHttp, type HttpLogger } from 'pino-http';

/** Incoming request IDs are reused only when they match this pattern (prevents log injection). */
export const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Probe endpoints logged at `debug` to avoid noise. */
const PROBE_PATHS: ReadonlySet<string> = new Set(['/health', '/ready']);

/** Returns the incoming request ID if it is safe to reuse, otherwise a fresh UUID. */
export function resolveRequestId(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  return value !== undefined && REQUEST_ID_PATTERN.test(value) ? value : randomUUID();
}

/** Strips the query string so query parameters (which may carry secrets) are not logged. */
function pathOf(url: string | undefined): string {
  if (url === undefined) return '';
  const queryStart = url.indexOf('?');
  return queryStart === -1 ? url : url.slice(0, queryStart);
}

/** Express sets `originalUrl`; routers may rewrite `url` while a request is in flight. */
function requestPath(req: IncomingMessage): string {
  const original = (req as IncomingMessage & { originalUrl?: unknown }).originalUrl;
  return pathOf(typeof original === 'string' ? original : req.url);
}

/** Chooses the completion log level for a request. */
export function requestLogLevel(
  req: IncomingMessage,
  res: ServerResponse,
  err?: Error,
): LevelWithSilent {
  if (err !== undefined) return 'error';
  if (req.method === 'GET' && PROBE_PATHS.has(requestPath(req))) return 'debug';
  if (res.statusCode >= 500) return 'error';
  if (res.statusCode >= 400) return 'warn';
  return 'info';
}

interface WrappedRequest {
  id: unknown;
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  raw: IncomingMessage;
}

interface WrappedResponse {
  statusCode: number;
  headers: OutgoingHttpHeaders;
}

/**
 * HTTP request logging middleware with request IDs. The chosen ID is exposed as
 * `req.id`, bound to `req.log`, and echoed on every response as `X-Request-Id`.
 * Response time is added by pino-http as `responseTime`.
 */
export function createRequestLogger(logger: Logger): HttpLogger {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = resolveRequestId(req.headers['x-request-id']);
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
    customLogLevel: requestLogLevel,
    serializers: {
      // Headers are kept so redaction paths (req.headers.*, res.headers.*) apply.
      req: (req: WrappedRequest) => ({
        id: req.id,
        method: req.method,
        url: requestPath(req.raw),
        headers: req.headers,
      }),
      res: (res: WrappedResponse) => ({
        statusCode: res.statusCode,
        headers: res.headers,
      }),
    },
  });
}
