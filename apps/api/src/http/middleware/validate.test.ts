import { createServer, type Server } from 'node:http';
import express from 'express';
import fc from 'fast-check';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createLogger } from '../../lib/logger.js';
import { errorHandler } from './error-handler.js';
import { createRequestLogger } from './request-logger.js';
import { validate, type Location } from './validate.js';

const NUM_RUNS = 100;

const paramsSchema = z.object({
  storeId: z.string().regex(/^[a-z]{3,8}$/),
  itemId: z.coerce.number().int().min(1).max(10_000),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100),
  sort: z.enum(['asc', 'desc']),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const bodySchema = z.object({
  name: z.string().min(1).max(30),
  price: z.number().int().min(0),
  tags: z.array(z.string()).max(5),
  quantity: z.number().int().min(1).default(1),
  meta: z.object({ color: z.enum(['red', 'green', 'blue']) }),
});

const nestedSchema = z.object({ a: z.object({ b: z.object({ c: z.string() }) }) });

/** Echoes what the downstream handler observed after validation. */
const echo: express.RequestHandler = (req, res) => {
  res.json({
    validated: req.validated ?? null,
    body: (req.body as unknown) ?? null,
    query: req.query,
    params: req.params,
  });
};

function buildTestApp(): express.Express {
  const app = express();
  app.use(createRequestLogger(createLogger({ level: 'silent' })));
  app.use(express.json());

  app.post(
    '/stores/:storeId/items/:itemId',
    validate({ params: paramsSchema, query: querySchema, body: bodySchema }),
    echo,
  );
  app.post('/body-only/:id', validate({ body: z.object({ name: z.string() }) }), echo);
  app.post('/query-only', validate({ query: z.object({ page: z.coerce.number() }) }), echo);
  app.post('/nested', validate({ body: nestedSchema }), echo);

  app.use(errorHandler);
  return app;
}

let server: Server;

beforeAll(async () => {
  server = createServer(buildTestApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

/** One field of the multi-location schema, with generators for valid and invalid values. */
interface FieldSpec {
  location: Location;
  /** Dotted path, as reported in error details. */
  path: string;
  /** Valid raw input; `undefined` means the field is omitted (only for fields with defaults). */
  valid: fc.Arbitrary<unknown>;
  invalid: fc.Arbitrary<unknown>;
}

const FIELDS: readonly FieldSpec[] = [
  {
    location: 'params',
    path: 'storeId',
    valid: fc.stringMatching(/^[a-z]{3,8}$/),
    invalid: fc.stringMatching(/^[0-9]{3,8}$/),
  },
  {
    location: 'params',
    path: 'itemId',
    valid: fc.integer({ min: 1, max: 10_000 }).map(String),
    invalid: fc.constantFrom('0', 'abc', '1.5', '-3', '10001'),
  },
  {
    location: 'query',
    path: 'page',
    valid: fc.integer({ min: 1, max: 100 }).map(String),
    invalid: fc.constantFrom('0', '101', 'x', '2.5'),
  },
  {
    location: 'query',
    path: 'sort',
    valid: fc.constantFrom('asc', 'desc'),
    invalid: fc.constantFrom('up', 'ASC', ''),
  },
  {
    location: 'query',
    path: 'limit',
    valid: fc.option(fc.integer({ min: 1, max: 50 }).map(String), { nil: undefined }),
    invalid: fc.constantFrom('0', '51', 'nope'),
  },
  {
    location: 'body',
    path: 'name',
    valid: fc.string({ minLength: 1, maxLength: 30 }),
    invalid: fc.oneof(fc.constant(''), fc.integer(), fc.string({ minLength: 31, maxLength: 40 })),
  },
  {
    location: 'body',
    path: 'price',
    valid: fc.integer({ min: 0, max: 100_000 }),
    invalid: fc.oneof(fc.integer({ min: -1000, max: -1 }), fc.constant('5'), fc.constant(1.5)),
  },
  {
    location: 'body',
    path: 'tags',
    valid: fc.array(fc.string({ maxLength: 10 }), { maxLength: 5 }),
    invalid: fc.oneof(fc.constant('tag'), fc.constant(null), fc.integer()),
  },
  {
    location: 'body',
    path: 'quantity',
    valid: fc.option(fc.integer({ min: 1, max: 99 }), { nil: undefined }),
    invalid: fc.oneof(fc.constant(0), fc.constant('two'), fc.constant(2.5)),
  },
  {
    location: 'body',
    path: 'meta.color',
    valid: fc.constantFrom('red', 'green', 'blue'),
    invalid: fc.oneof(fc.constant('purple'), fc.constant(5), fc.constant(null)),
  },
];

type RawInput = Record<Location, Record<string, unknown>>;

/** Assigns `value` at a dotted path, creating intermediate objects; skips `undefined`. */
function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  if (value === undefined) return;
  const segments = path.split('.');
  let node = target;
  for (const segment of segments.slice(0, -1)) {
    node[segment] ??= {};
    node = node[segment] as Record<string, unknown>;
  }
  node[segments[segments.length - 1]!] = value;
}

function buildInput(values: readonly unknown[]): RawInput {
  const input: RawInput = { params: {}, query: {}, body: {} };
  FIELDS.forEach((field, i) => setPath(input[field.location], field.path, values[i]));
  return input;
}

function send(input: RawInput): request.Test {
  const storeId = encodeURIComponent(String(input.params.storeId));
  const itemId = encodeURIComponent(String(input.params.itemId));
  return request(server)
    .post(`/stores/${storeId}/items/${itemId}`)
    .query(input.query as Record<string, string>)
    .send(input.body);
}

const validValuesArb = fc.tuple(...FIELDS.map((field) => field.valid));

const LOCATION_ORDER: Record<Location, number> = { params: 0, query: 1, body: 2 };

interface Detail {
  location: Location;
  path: string;
  message: string;
}

/** Shape of the `echo` handler's response. */
interface EchoBody {
  validated: Record<string, Record<string, unknown>> | null;
  body: Record<string, unknown> | null;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
}

interface ErrorBody {
  error: { code: string; message: string; requestId: string; details?: Detail[] };
}

const echoOf = (res: request.Response): EchoBody => res.body as EchoBody;
const errorOf = (res: request.Response): ErrorBody['error'] => (res.body as ErrorBody).error;

describe('validate', () => {
  it('Feature: quickbyte-food-delivery, Property 6: Validation passes valid input through parsed', async () => {
    // **Validates: Requirements 1.4, 13.4**
    await fc.assert(
      fc.asyncProperty(validValuesArb, async (values) => {
        const input = buildInput(values);
        const res = await send(input);

        const expected = {
          params: paramsSchema.parse(input.params),
          query: querySchema.parse(input.query),
          body: bodySchema.parse(input.body),
        };
        expect(res.status).toBe(200);
        const { validated, body } = echoOf(res);
        expect(validated).toEqual(expected);
        expect(body).toEqual(expected.body);
        // Coercions and defaults are applied.
        expect(typeof validated?.params?.itemId).toBe('number');
        expect(typeof validated?.query?.page).toBe('number');
        expect(validated?.query?.limit).toBe(input.query.limit === undefined ? 20 : Number(input.query.limit));
        expect(body?.quantity).toBe(input.body.quantity ?? 1);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: quickbyte-food-delivery, Property 7: Validation reports every invalid field', async () => {
    // **Validates: Requirements 1.4, 13.4, 23.3**
    const indices = FIELDS.map((_, i) => i);
    const caseArb = fc
      .tuple(validValuesArb, fc.subarray(indices, { minLength: 1 }))
      .chain(([values, corrupted]) =>
        fc
          .tuple(...corrupted.map((i) => FIELDS[i]!.invalid))
          .map((bad) => {
            const next = [...values];
            corrupted.forEach((fieldIndex, j) => {
              next[fieldIndex] = bad[j];
            });
            return { values: next, corrupted };
          }),
      );

    await fc.assert(
      fc.asyncProperty(caseArb, async ({ values, corrupted }) => {
        const res = await send(buildInput(values));

        expect(res.status).toBe(400);
        const error = errorOf(res);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.message).toBe('Request validation failed');
        expect(error.requestId).toBe(res.headers['x-request-id']);

        expect(Array.isArray(error.details)).toBe(true);
        const details = error.details ?? [];
        for (const detail of details) {
          expect(typeof detail.message).toBe('string');
          expect(detail.message.length).toBeGreaterThan(0);
        }

        const reported = new Set(details.map((d) => `${d.location}:${d.path}`));
        const expected = new Set(corrupted.map((i) => `${FIELDS[i]!.location}:${FIELDS[i]!.path}`));
        expect(reported).toEqual(expected);

        // Details are grouped in params, query, body order.
        const order = details.map((d) => LOCATION_ORDER[d.location]);
        expect(order).toEqual([...order].sort((a, b) => a - b));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('validates only the provided location and leaves the others untouched', async () => {
    const res = await request(server)
      .post('/body-only/42?page=abc&extra=1')
      .send({ name: 'pizza', unknownKey: true });

    expect(res.status).toBe(200);
    const echoed = echoOf(res);
    expect(Object.keys(echoed.validated ?? {})).toEqual(['body']);
    // Unknown keys are stripped from the parsed body that replaces req.body.
    expect(echoed.body).toEqual({ name: 'pizza' });
    // Query and params keep their raw string values.
    expect(echoed.query).toEqual({ page: 'abc', extra: '1' });
    expect(echoed.params).toEqual({ id: '42' });
  });

  it('does not replace req.body when no body schema is given', async () => {
    const res = await request(server).post('/query-only?page=3').send({ anything: [1, 2] });

    expect(res.status).toBe(200);
    const echoed = echoOf(res);
    expect(echoed.validated).toEqual({ query: { page: 3 } });
    expect(echoed.body).toEqual({ anything: [1, 2] });
    // req.query is not reassigned; the coerced value lives in req.validated.
    expect(echoed.query).toEqual({ page: '3' });
  });

  it('reports nested body paths joined with dots', async () => {
    const res = await request(server).post('/nested').send({ a: { b: { c: 1 } } });

    expect(res.status).toBe(400);
    const error = errorOf(res);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toHaveLength(1);
    expect(error.details?.[0]).toMatchObject({ location: 'body', path: 'a.b.c' });
  });
});
