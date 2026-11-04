import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express, { type ErrorRequestHandler } from 'express';
import fc from 'fast-check';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppError, type ErrorCode, type ErrorDetail } from '../../lib/app-error.js';
import { createLogger } from '../../lib/logger.js';
import { errorHandler } from './error-handler.js';
import { notFoundHandler } from './not-found.js';
import { createRequestLogger } from './request-logger.js';

const NUM_RUNS = 100;

/** Value thrown by `GET /throw`; set by each test run before the request is sent. */
let toThrow: unknown;
/** Errors that reached the middleware after `errorHandler` (headersSent delegation). */
let delegated: unknown[] = [];

const REGISTERED_SEGMENTS = new Set(['throw', 'echo', 'partial']);

function buildTestApp(): express.Express {
  const app = express();
  app.use(createRequestLogger(createLogger({ level: 'silent' })));
  app.use(express.json({ limit: '100kb' }));

  // Async so falsy throws (null, '') still reach the error handler: Express 5 converts
  // a falsy rejection into `new Error('Rejected promise')`.
  app.get('/throw', async () => {
    await Promise.resolve();
    throw toThrow;
  });
  app.post('/echo', (req, res) => {
    res.json({ received: req.body as unknown });
  });
  app.get('/partial', (_req, res, next) => {
    res.status(202);
    res.write('partial');
    next(new Error('failed after headers were sent'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  // Stands in for Express's default handler so delegation can be observed.
  // Express identifies error middleware by its four-parameter arity.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const recordDelegation: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
    delegated.push(err);
    res.end();
  };
  app.use(recordDelegation);
  return app;
}

let server: Server;

beforeAll(async () => {
  server = createServer(buildTestApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  expect((server.address() as AddressInfo).port).toBeGreaterThan(0);
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

beforeEach(() => {
  delegated = [];
});

const ERROR_CODES: readonly ErrorCode[] = [
  'VALIDATION_ERROR',
  'INVALID_JSON',
  'PAYLOAD_TOO_LARGE',
  'NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'CONFLICT',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
];

const detailArb: fc.Arbitrary<ErrorDetail> = fc.record(
  {
    location: fc.constantFrom('body' as const, 'query' as const, 'params' as const),
    path: fc.string({ maxLength: 20 }),
    message: fc.string({ maxLength: 40 }),
  },
  { requiredKeys: ['path', 'message'] },
);

const appErrorArb = fc
  .record({
    statusCode: fc.integer({ min: 400, max: 599 }),
    code: fc.constantFrom(...ERROR_CODES),
    message: fc.string({ minLength: 1, maxLength: 60 }),
    details: fc.option(fc.array(detailArb, { maxLength: 4 }), { nil: undefined }),
  })
  .map(({ statusCode, code, message, details }) => new AppError(statusCode, code, message, details));

/** Plain objects without a `type` key, so none look like body-parser errors. */
const plainObjectArb = fc
  .dictionary(fc.string({ maxLength: 10 }), fc.oneof(fc.string(), fc.integer(), fc.boolean()), {
    maxKeys: 5,
  })
  .filter((obj) => !Object.prototype.hasOwnProperty.call(obj, 'type'));

const nonAppErrorArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.string({ maxLength: 60 }),
  plainObjectArb,
  fc.string({ maxLength: 60 }).map((msg) => new Error(msg)),
  fc.string({ maxLength: 60 }).map((msg) => new TypeError(msg)),
  fc.constant(null),
);

interface Expected {
  status: number;
  code: ErrorCode;
  message: string;
  details?: ErrorDetail[];
}

function expectedFor(thrown: unknown): Expected {
  if (thrown instanceof AppError) {
    if (thrown.statusCode < 500) {
      const expected: Expected = { status: thrown.statusCode, code: thrown.code, message: thrown.message };
      if (thrown.details && thrown.details.length > 0) expected.details = [...thrown.details];
      return expected;
    }
    return {
      status: thrown.statusCode,
      code: thrown.code,
      message: thrown.statusCode === 503 ? 'Service unavailable' : 'Internal server error',
    };
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' };
}

/** Asserts the body is exactly `{ error: { code, message, requestId, details? } }`. */
function expectStandardShape(body: unknown, requestIdHeader: unknown): void {
  expect(body).toBeTypeOf('object');
  expect(Object.keys(body as object)).toEqual(['error']);
  const error = (body as { error: Record<string, unknown> }).error;
  const keys = Object.keys(error).sort();
  const allowed = ['code', 'details', 'message', 'requestId'];
  expect(keys.every((k) => allowed.includes(k))).toBe(true);
  expect(keys).toEqual(expect.arrayContaining(['code', 'message', 'requestId']));
  expect(typeof error.code).toBe('string');
  expect(typeof error.message).toBe('string');
  expect(typeof requestIdHeader).toBe('string');
  expect((requestIdHeader as string).length).toBeGreaterThan(0);
  expect(error.requestId).toBe(requestIdHeader);
}

describe('errorHandler', () => {
  it('Feature: quickbyte-food-delivery, Property 4: Error responses have one consistent shape', async () => {
    // **Validates: Requirements 24.6**
    await fc.assert(
      fc.asyncProperty(fc.oneof(appErrorArb, nonAppErrorArb), async (thrown) => {
        toThrow = thrown;
        const res = await request(server).get('/throw');
        const expected = expectedFor(thrown);

        expect(res.status).toBe(expected.status);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expectStandardShape(res.body, res.headers['x-request-id']);

        const error = (res.body as { error: Record<string, unknown> }).error;
        expect(error.code).toBe(expected.code);
        expect(error.message).toBe(expected.message);
        if (expected.details) {
          expect(error.details).toEqual(expected.details);
        } else {
          expect(error).not.toHaveProperty('details');
        }

        if (expected.status >= 500 && thrown instanceof Error) {
          // The message is exactly the generic text (asserted above), so the original
          // message cannot appear unless it is a substring of the generic text itself.
          if (!expected.message.includes(thrown.message)) {
            expect(error.message).not.toContain(thrown.message);
          }
          if (thrown.stack) expect(res.text).not.toContain(JSON.stringify(thrown.stack).slice(1, -1));
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: quickbyte-food-delivery, Property 5: Unknown routes return 404 in the standard shape', async () => {
    // **Validates: Requirements 24.6**
    const segmentArb = fc.stringMatching(/^[A-Za-z0-9_-]{1,12}$/);
    const pathArb = fc
      .array(segmentArb, { minLength: 1, maxLength: 4 })
      .filter((segments) => !REGISTERED_SEGMENTS.has(segments[0]!))
      .map((segments) => `/${segments.join('/')}`);
    const methodArb = fc.constantFrom('get', 'post', 'put', 'patch', 'delete' as const);

    await fc.assert(
      fc.asyncProperty(methodArb, pathArb, async (method, path) => {
        const res = await request(server)[method](path);

        expect(res.status).toBe(404);
        expectStandardShape(res.body, res.headers['x-request-id']);
        const error = (res.body as { error: Record<string, unknown> }).error;
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toBe(`Route ${method.toUpperCase()} ${path} not found`);
        expect(error).not.toHaveProperty('details');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('returns 400 INVALID_JSON for a malformed JSON body', async () => {
    const res = await request(server)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"name": "pizza",');

    expect(res.status).toBe(400);
    expectStandardShape(res.body, res.headers['x-request-id']);
    expect(res.body).toEqual({
      error: { code: 'INVALID_JSON', message: 'Malformed JSON body', requestId: res.headers['x-request-id'] },
    });
  });

  it('returns 413 PAYLOAD_TOO_LARGE for a body over 100 kB', async () => {
    const res = await request(server)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ blob: 'x'.repeat(110 * 1024) }));

    expect(res.status).toBe(413);
    expectStandardShape(res.body, res.headers['x-request-id']);
    expect(res.body).toEqual({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body too large',
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('accepts a valid JSON body under the limit', async () => {
    const res = await request(server).post('/echo').send({ name: 'pizza' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: { name: 'pizza' } });
  });

  it('delegates to next(err) without writing a second response when headers were already sent', async () => {
    const res = await request(server).get('/partial');

    expect(res.status).toBe(202);
    expect(res.text).toBe('partial');
    expect(res.text).not.toContain('error');
    expect(delegated).toHaveLength(1);
    expect((delegated[0] as Error).message).toBe('failed after headers were sent');
  });

  it('reuses a valid incoming X-Request-Id in the error body', async () => {
    toThrow = new AppError(409, 'CONFLICT', 'Already exists');
    const res = await request(server).get('/throw').set('X-Request-Id', 'abc-123');

    expect(res.status).toBe(409);
    expect(res.headers['x-request-id']).toBe('abc-123');
    expect(res.body).toEqual({
      error: { code: 'CONFLICT', message: 'Already exists', requestId: 'abc-123' },
    });
  });
});
