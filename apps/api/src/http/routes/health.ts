import { Router } from 'express';
import type { DbState } from '../../db/mongo.js';

export interface HealthResponse {
  status: 'ok';
  uptimeSeconds: number;
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  checks: { mongo: DbState };
}

export interface HealthRouterDeps {
  getDbState: () => DbState;
}

/**
 * Liveness (`GET /health`) and readiness (`GET /ready`) probes.
 * A 503 from `/ready` is a status report, not an error, so it bypasses the error envelope.
 */
export function createHealthRouter({ getDbState }: HealthRouterDeps): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok', uptimeSeconds: process.uptime() };
    res.status(200).json(body);
  });

  router.get('/ready', (_req, res) => {
    const mongo = getDbState();
    const ready = mongo === 'connected';
    const body: ReadinessResponse = {
      status: ready ? 'ready' : 'not_ready',
      checks: { mongo },
    };
    res.set('Cache-Control', 'no-store');
    res.status(ready ? 200 : 503).json(body);
  });

  return router;
}
