/**
 * ------------------------------------------------------------------
 * Express Application Factory
 * ------------------------------------------------------------------
 * Builds the Express app: global middleware → routes → error handler.
 * Contains no startup side effects (no listen, no DB), so it can be
 * reused as-is in tests.
 * ------------------------------------------------------------------
 */

import cors from 'cors';
import express, { type Express } from 'express';
import { errorHandler } from './api/middleware/error-handler.middleware';
import { registerRoutes } from './api/routes';
import type { Container } from './bootstrap/container';
import { BODY_SIZE_LIMIT, CORS_OPTIONS } from './constants';

export function createApp(container: Container): Express {
  const app = express();

  // Global middleware
  app.use(cors(CORS_OPTIONS));
  app.use(express.json({ limit: BODY_SIZE_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: BODY_SIZE_LIMIT }));

  // Routes
  registerRoutes(app, container);

  // Error handler (must be registered last)
  app.use(errorHandler);

  return app;
}
