/**
 * ------------------------------------------------------------------
 * HTTP Constants
 * ------------------------------------------------------------------
 */

import type { CorsOptions } from 'cors';

/** Host the server binds to unless the user picks another at startup. */
export const DEFAULT_HOST = '0.0.0.0';

/** Base path under which the emulate REST API is mounted. */
export const API_V1_PREFIX = '/api/v1';

/** Max accepted request body size (captured traffic can be large). */
export const BODY_SIZE_LIMIT = '50mb';

/** Open CORS policy: the service is consumed by a local frontend. */
export const CORS_OPTIONS: CorsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

/** Value of `service` in the `/health` response. */
export const SERVICE_NAME = 'phantoma-emulate-service';
