import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EnvValidationError, loadEnv } from './env.js';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
const NODE_ENVS = ['development', 'test', 'production'] as const;
const SCHEMA_KEYS = new Set([
  'NODE_ENV',
  'HOST',
  'PORT',
  'LOG_LEVEL',
  'MONGODB_URI',
  'MONGODB_SERVER_SELECTION_TIMEOUT_MS',
  'SHUTDOWN_TIMEOUT_MS',
]);

const BASE_ENV = { MONGODB_URI: 'mongodb://localhost:27017/quickbyte' };

/** Runs `fn` and returns the thrown EnvValidationError, failing if none is thrown. */
function captureEnvError(fn: () => unknown): EnvValidationError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(EnvValidationError);
    return err as EnvValidationError;
  }
  throw new Error('expected loadEnv to throw EnvValidationError');
}

// --- Generators ---------------------------------------------------------

const mongoUriArb = fc
  .tuple(
    fc.constantFrom('mongodb://', 'mongodb+srv://'),
    fc.domain(),
    fc.option(fc.integer({ min: 1, max: 65535 }), { nil: undefined }),
    fc.stringMatching(/^[a-z0-9_-]{0,20}$/),
  )
  .map(([scheme, host, port, db]) => `${scheme}${host}${port === undefined ? '' : `:${String(port)}`}/${db}`);

/** Optional entry: either omitted (undefined) or a valid value. */
const opt = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: undefined });

const validEnvArb = fc.record({
  NODE_ENV: opt(fc.constantFrom(...NODE_ENVS)),
  HOST: opt(fc.oneof(fc.domain(), fc.ipV4(), fc.constant('0.0.0.0'))),
  PORT: opt(fc.integer({ min: 1, max: 65535 })),
  LOG_LEVEL: opt(fc.constantFrom(...LOG_LEVELS)),
  MONGODB_URI: mongoUriArb,
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: opt(fc.integer({ min: 100, max: 60000 })),
  SHUTDOWN_TIMEOUT_MS: opt(fc.integer({ min: 1000, max: 120000 })),
  extra: fc.dictionary(fc.stringMatching(/^X_[A-Z0-9_]{1,12}$/), fc.string(), { maxKeys: 5 }),
});

/*
 * Invalid values are generated to be distinctive (at least a few characters,
 * not common English words) so that a "value does not appear in the message"
 * check is meaningful and cannot match a fixed message by coincidence.
 */
const invalidCaseArb: fc.Arbitrary<{ variable: string; value: string | undefined }> = fc.oneof(
  fc.constant({ variable: 'MONGODB_URI', value: undefined }),
  fc
    .tuple(fc.constantFrom('http://', 'https://', 'postgres://', 'redis://', 'mongo://'), fc.domain())
    .map(([scheme, host]) => ({ variable: 'MONGODB_URI', value: `${scheme}${host}/db` })),
  fc
    .oneof(fc.integer({ min: 65536, max: 10_000_000 }), fc.integer({ min: -10_000_000, max: 0 }))
    .map((n) => ({ variable: 'PORT', value: String(n) })),
  fc.stringMatching(/^[a-z]{3}[a-z0-9]{3,12}$/).map((s) => ({ variable: 'PORT', value: `p_${s}` })),
  fc
    .stringMatching(/^[a-z]{4,12}$/)
    .filter((s) => !(LOG_LEVELS as readonly string[]).includes(s))
    .map((s) => ({ variable: 'LOG_LEVEL', value: `lvl_${s}` })),
);

// --- Properties ---------------------------------------------------------

describe('loadEnv', () => {
  it('Feature: quickbyte-food-delivery, Property 1: Valid environments load', () => {
    // **Validates: Requirements 24.5**
    fc.assert(
      fc.property(validEnvArb, ({ extra, ...vars }) => {
        const source: Record<string, string | undefined> = { ...extra };
        for (const [key, value] of Object.entries(vars)) {
          if (value !== undefined) source[key] = String(value);
        }

        const env = loadEnv(source);

        expect(Object.isFrozen(env)).toBe(true);
        expect(env).toEqual({
          NODE_ENV: vars.NODE_ENV ?? 'development',
          HOST: vars.HOST ?? '0.0.0.0',
          PORT: vars.PORT ?? 3000,
          LOG_LEVEL: vars.LOG_LEVEL ?? 'info',
          MONGODB_URI: vars.MONGODB_URI,
          MONGODB_SERVER_SELECTION_TIMEOUT_MS: vars.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 5000,
          SHUTDOWN_TIMEOUT_MS: vars.SHUTDOWN_TIMEOUT_MS ?? 10000,
        });
        // Unrelated variables are not carried into the config.
        for (const key of Object.keys(env)) expect(SCHEMA_KEYS.has(key)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('Feature: quickbyte-food-delivery, Property 2: Invalid environments fail fast without leaking values', () => {
    // **Validates: Requirements 24.5, 24.6**
    fc.assert(
      fc.property(validEnvArb, invalidCaseArb, ({ extra, ...vars }, { variable, value }) => {
        const source: Record<string, string | undefined> = { ...extra };
        for (const [key, v] of Object.entries(vars)) {
          if (v !== undefined) source[key] = String(v);
        }
        if (value === undefined) delete source[variable];
        else source[variable] = value;

        const err = captureEnvError(() => loadEnv(source));

        expect(err.issues.map((i) => i.variable)).toEqual([variable]);
        expect(err.message).toContain(variable);
        if (value !== undefined) {
          expect(err.message).not.toContain(value);
          expect(JSON.stringify(err.issues)).not.toContain(value);
        }
      }),
      { numRuns: 200 },
    );
  });

  // --- Examples ---------------------------------------------------------

  it('applies defaults when optional variables are absent', () => {
    expect(loadEnv({ ...BASE_ENV })).toEqual({
      NODE_ENV: 'development',
      HOST: '0.0.0.0',
      PORT: 3000,
      LOG_LEVEL: 'info',
      MONGODB_URI: BASE_ENV.MONGODB_URI,
      MONGODB_SERVER_SELECTION_TIMEOUT_MS: 5000,
      SHUTDOWN_TIMEOUT_MS: 10000,
    });
  });

  it('reports several invalid variables in one error', () => {
    const err = captureEnvError(() =>
      loadEnv({
        MONGODB_URI: 'http://secret-host.example/db',
        PORT: '70000',
        LOG_LEVEL: 'verbose',
        SHUTDOWN_TIMEOUT_MS: '5',
      }),
    );

    const variables = err.issues.map((i) => i.variable).sort();
    expect(variables).toEqual(['LOG_LEVEL', 'MONGODB_URI', 'PORT', 'SHUTDOWN_TIMEOUT_MS']);
    expect(err.name).toBe('EnvValidationError');
    expect(err.message).toBe(
      `Invalid environment configuration: ${err.issues.map((i) => i.variable).join(', ')}`,
    );
    expect(err.message).not.toContain('secret-host');
  });
});
