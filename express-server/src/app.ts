/**
 * ------------------------------------------------------------------
 * Express App Factory
 * ------------------------------------------------------------------
 * Mirrors AIWeb2API_temp/src/app.ts structure but adapted for Phantoma:
 * CORS → JSON body parser → request logger → API router → 404 → error handler.
 * The Go server applied middleware in the order cors(RequestLogger(mux));
 * here we keep the same semantic ordering within Express's pipeline.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import express from 'express';
import cors from 'cors';

// ── Middleware 
import { requestLogger } from './middleware/request-logger.middleware';
import { errorHandler } from './middleware/error-handler.middleware';

// ── Routes 
import { createApiRouter } from './routes';

// ─── Factory ────────────────────────────────────────────────────────────

export function createApp() {
  const app = express();

  // ─── Global middleware ───────────────────────────────────────────────
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(requestLogger);

  // ─── API routes ──────────────────────────────────────────────────────
  app.use(createApiRouter());

  // ─── 404 fallback ────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Cannot ${req.method} ${req.path}`,
    });
  });

  // ─── Centralized error handler (must be registered last) ─────────────
  app.use(errorHandler);

  return app;
}