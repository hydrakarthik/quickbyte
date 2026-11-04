import pino, { type DestinationStream, type Logger, type LevelWithSilent } from 'pino';

/**
 * Log paths whose values are replaced with `[REDACTED]` before serialization.
 * Covers credential-bearing headers and common secret field names one level deep.
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
  '*.apiKey',
  '*.mongoUri',
] as const;

export interface LoggerOptions {
  level: LevelWithSilent;
  /** Injected in tests to capture output; defaults to stdout. */
  destination?: DestinationStream;
}

/** Creates the structured JSON logger used across the API. */
export function createLogger({ level, destination }: LoggerOptions): Logger {
  return pino(
    {
      level,
      base: { service: 'quickbyte-api' },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: { paths: [...REDACT_PATHS], censor: '[REDACTED]' },
    },
    destination,
  );
}
