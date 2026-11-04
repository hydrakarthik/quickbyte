import { z } from 'zod';

/*
 * Every validator carries an explicit `error` message. Zod 4 default messages
 * describe expected types and bounds rather than echoing input, but explicit
 * messages keep that guarantee stable across Zod upgrades. Messages must never
 * interpolate the supplied value, because they are printed at startup.
 */

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
const NODE_ENVS = ['development', 'test', 'production'] as const;

function integerInRange(min: number, max: number) {
  return z.coerce
    .number({ error: 'must be a number' })
    .int({ error: 'must be an integer' })
    .min(min, { error: `must be >= ${String(min)}` })
    .max(max, { error: `must be <= ${String(max)}` });
}

const mongoUri = z
  .string({ error: 'is required' })
  .min(1, { error: 'is required' })
  .refine((v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'), {
    error: 'must start with mongodb:// or mongodb+srv://',
  });

export const envSchema = z.object({
  NODE_ENV: z
    .enum(NODE_ENVS, { error: `must be one of ${NODE_ENVS.join(', ')}` })
    .default('development'),
  HOST: z.string({ error: 'must be a string' }).min(1, { error: 'must not be empty' }).default('0.0.0.0'),
  PORT: integerInRange(1, 65535).default(3000),
  LOG_LEVEL: z
    .enum(LOG_LEVELS, { error: `must be one of ${LOG_LEVELS.join(', ')}` })
    .default('info'),
  MONGODB_URI: mongoUri,
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: integerInRange(100, 60000).default(5000),
  SHUTDOWN_TIMEOUT_MS: integerInRange(1000, 120000).default(10000),
});

export type Env = z.infer<typeof envSchema>;

export interface EnvIssue {
  variable: string;
  message: string;
}

export class EnvValidationError extends Error {
  constructor(public readonly issues: ReadonlyArray<EnvIssue>) {
    super(`Invalid environment configuration: ${issues.map((i) => i.variable).join(', ')}`);
    this.name = 'EnvValidationError';
  }
}

/** Pure: reads only the given source. Never includes variable values in errors. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => ({
        variable: String(issue.path[0] ?? '(root)'),
        message: issue.message,
      })),
    );
  }
  return Object.freeze(result.data);
}
