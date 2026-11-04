import { Writable } from 'node:stream';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { LevelWithSilent } from 'pino';
import { createLogger, REDACT_PATHS } from './logger.js';

/** In-memory destination that collects every line pino writes. */
function captureStream(): { stream: Writable; output: () => string; lines: () => Record<string, unknown>[] } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  const output = () => chunks.join('');
  const lines = () =>
    output()
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  return { stream, output, lines };
}

function newLogger(level: LevelWithSilent = 'info') {
  const capture = captureStream();
  const logger = createLogger({ level, destination: capture.stream });
  return { logger, ...capture };
}

/**
 * Distinctive secrets: a fixed prefix plus 16+ alphanumeric characters, so a match in the
 * output can only come from the secret itself (no JSON escaping, no overlap with other fields).
 */
const secretArb = fc
  .string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), minLength: 16, maxLength: 48 })
  .map((s) => `QBSECRET_${s}`);

type SecretLocation = 'authorization' | 'cookie' | 'password' | 'token' | 'secret' | 'apiKey';

const locationArb = fc.constantFrom<SecretLocation>('authorization', 'cookie', 'password', 'token', 'secret', 'apiKey');

/** Builds a log object placing the secret at the given location (field secrets nested one level deep). */
function buildLogObject(location: SecretLocation, secret: string): Record<string, unknown> {
  if (location === 'authorization' || location === 'cookie') {
    return { req: { method: 'GET', url: '/orders', headers: { host: 'localhost', [location]: secret } } };
  }
  return { account: { id: 'acc_1', [location]: secret } };
}

describe('createLogger', () => {
  it('Feature: quickbyte-food-delivery, Property 3: Secrets are redacted from logs', () => {
    // **Validates: Requirements 24.6, 2.7**
    fc.assert(
      fc.property(locationArb, secretArb, (location, secret) => {
        const { logger, output } = newLogger('info');
        logger.info(buildLogObject(location, secret), 'event');
        const text = output();
        expect(text).not.toContain(secret);
        expect(text).toContain('[REDACTED]');
      }),
      { numRuns: 100 },
    );
  });

  it('Feature: quickbyte-food-delivery, Property 3: Secrets are redacted from logs (all locations in one entry)', () => {
    // **Validates: Requirements 24.6, 2.7**
    fc.assert(
      fc.property(fc.array(secretArb, { minLength: 6, maxLength: 6 }), ([auth, cookie, password, token, secret, apiKey]) => {
        const { logger, output } = newLogger('info');
        logger.info(
          {
            req: { headers: { authorization: auth, cookie } },
            account: { password, token, secret, apiKey },
          },
          'event',
        );
        const text = output();
        for (const value of [auth, cookie, password, token, secret, apiKey]) {
          expect(text).not.toContain(value);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('exports redact paths covering credential headers and secret fields', () => {
    expect(REDACT_PATHS).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.token',
        '*.secret',
        '*.apiKey',
      ]),
    );
  });

  it('includes the service base field on every entry', () => {
    const { logger, lines } = newLogger('info');
    logger.info('first');
    logger.warn({ orderId: 'o_1' }, 'second');
    const entries = lines();
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.service).toBe('quickbyte-api');
    }
    expect(entries[1]?.orderId).toBe('o_1');
  });

  it('honors the configured level', () => {
    const { logger, lines } = newLogger('warn');
    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');
    expect(lines().map((entry) => entry.msg)).toEqual(['warn', 'error']);
    expect(logger.isLevelEnabled('info')).toBe(false);
  });

  it('writes nothing when the level is silent', () => {
    const { logger, output } = newLogger('silent');
    logger.fatal('fatal');
    expect(output()).toBe('');
  });
});
