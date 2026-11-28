import express, { Express } from 'express';
import cors from 'cors';
import { getConfig } from './config/server.config';
import { requireToken } from './api/middleware/auth.middleware';
import { errorHandler } from './api/middleware/error-handler.middleware';
import { registerRoutes } from './api/routes/routes';
import { ApiControllers } from './api/controllers/controller-set';

export function createApp(apiControllers: ApiControllers): Express {
  const cfg = getConfig();
  const app = express();

  // ASSUMED: renderer origin chưa xác định (docs mục 7.4) → chưa đặt CODE_ALLOWED_ORIGINS thì giữ '*'
  app.use(
    cors({
      origin: cfg.allowedOrigins.length > 0 ? cfg.allowedOrigins : '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '50mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'phantoma-code-server' });
  });

  app.use('/api/v1', requireToken(cfg.token), registerRoutes(apiControllers));
  app.use(errorHandler);

  return app;
}