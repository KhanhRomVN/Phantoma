export const SERVICE_NAME = 'phantoma-server';
export const API_PREFIX = '/api/v1';
export const HEALTH_PATH = '/health';

/** Host mặc định khi khởi động (người dùng có thể đổi qua Welcome UI). */
export const DEFAULT_HOST = '0.0.0.0';

export const REQUEST_BODY_LIMIT = '50mb';
export const SHUTDOWN_TIMEOUT_MS = 10_000;

export const CORS_OPTIONS = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
