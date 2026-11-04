import type { Express } from 'express';
import fc from 'fast-check';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import type { DbState } from './db/mongo.js';
import { createLogger } from './lib/logger.js';

const NUM_RUNS = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

const DB_STATES: readonly DbState[] = ['disconnected', 'connecting', 'connected', 'disconnecting'];

/** Mutable state read by the stubbed `getDbState`; set per run. */
let dbState: DbState = 'connected';

/** Built once: no listening port is opened by the app itself, and no database is used. */
const app: Express = createApp({
  logger: createLogger({ level: 'silent' }),
  getDbState: () => dbState,
});

const VALID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-';

/** Printable ASCII (no whitespace, so HTTP parsing does not trim it) outside the allowed set. */
const INVALID_CHARS = Array.from({ length: 0x7e - 0x21 + 1 }, (_, i) => String.fromCharCode(0x21 + i)).filter(
  (ch) => !VALID_CHARS.includes(ch),
);

const validIdArb = fc.stringMatching(VALID_ID_PATTERN);

/** Header values that are legal on the wire but must not be reused as request IDs. */
const invalidIdArb: fc.Arbitrary<string> = fc.oneof(
  // Contains at least one disallowed character.
  fc
    .tuple(
      fc.string({ unit: fc.constantFrom(...VALID_CHARS), maxLength: 20 }),
      fc.constantFrom(...INVALID_CHARS),
      fc.string({ unit: fc.constantFrom(...VALID_CHARS), maxLength: 20 }),
    )
    .map(([a, bad, b]) => `${a}${bad}${b}`),
  // Too long (over 128 characters) but otherwise valid.
  fc.string({ unit: fc.constantFrom(...VALID_CHARS), minLength: 129, maxLength: 200 }),
  // Empty.
  fc.constant(''),
);

/** `undefined` means the header is omitted. */
const incomingIdArb: fc.Arbitrary<{ header: string | undefined; reusable: boolean }> = fc.oneof(
  validIdArb.map((header) => ({ header, reusable: true })),
  invalidIdArb.map((header) => ({ header, reusable: false })),
  fc.constant({ header: undefined, reusable: false }),
);

const pathArb = fc.constantFrom('/health', '/ready', '/does-not-exist', '/api/v1/unknown');

describe('createApp', () => {
  it('Feature: quickbyte-food-delivery, Property 8: Readiness reflects database state; request IDs are propagated', async () => {
    // **Validates: Requirements 24.5, 24.6**
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...DB_STATES), incomingIdArb, pathArb, async (state, incoming, path) => {
        dbState = state;

        // Readiness reflects the database state.
        const ready = await request(app).get('/ready');
        if (state === 'connected') {
          expect(ready.status).toBe(200);
          expect(ready.body).toEqual({ status: 'ready', checks: { mongo: 'connected' } });
        } else {
          expect(ready.status).toBe(503);
          expect(ready.body).toEqual({ status: 'not_ready', checks: { mongo: state } });
        }

        // Request IDs are reused when safe, otherwise freshly generated, on any route.
        let req = request(app).get(path);
        if (incoming.header !== undefined) req = req.set('X-Request-Id', incoming.header);
        const res = await req;
        const echoed = res.headers['x-request-id'];

        expect(typeof echoed).toBe('string');
        if (incoming.reusable) {
          expect(echoed).toBe(incoming.header);
        } else {
          expect(echoed).toMatch(UUID_PATTERN);
          expect(echoed).not.toBe(incoming.header);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('GET /health returns 200 with a numeric uptimeSeconds', async () => {
    const res = await request(app).get('/health');

    const body = res.body as { status: unknown; uptimeSeconds: unknown };

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.uptimeSeconds).toBe('number');
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('does not send the x-powered-by header', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sets Cache-Control: no-store on /ready in both ready and not-ready states', async () => {
    dbState = 'connected';
    const ok = await request(app).get('/ready');
    dbState = 'disconnected';
    const notReady = await request(app).get('/ready');

    expect(ok.headers['cache-control']).toBe('no-store');
    expect(notReady.headers['cache-control']).toBe('no-store');
  });

  it('returns 404 NOT_FOUND for an unknown route through the real app wiring', async () => {
    const res = await request(app).get('/nope').set('X-Request-Id', 'req-42');

    expect(res.status).toBe(404);
    expect(res.headers['x-request-id']).toBe('req-42');
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route GET /nope not found', requestId: 'req-42' },
    });
  });
});
