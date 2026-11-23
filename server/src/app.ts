/**
 * ------------------------------------------------------------------
 * Express App Factory
 * ------------------------------------------------------------------
 * Thứ tự middleware: CORS → body parser → request logger → API router
 * → 404 → error handler.
 * ------------------------------------------------------------------
 */

import cors from 'cors';
import express from 'express';
import type { AppContainer } from './bootstrap/container';
import { CORS_OPTIONS, REQUEST_BODY_LIMIT } from './constants';
import { errorHandler } from './api/middleware/error-handler.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { createApiRouter } from './api/routes';
import { sendError } from './utils/http-response.util';

export function createApp(container: AppContainer): express.Express {
  const app = express();

  app.use(cors(CORS_OPTIONS));
  app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));
  app.use(requestLogger);

  app.use(createApiRouter(container));

  app.use((req, res) => sendError(res, 404, `Cannot ${req.method} ${req.path}`));
  app.use(errorHandler); // phải đăng ký cuối cùng

  return app;
}
