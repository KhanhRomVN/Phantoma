import express, { Express, Router } from 'express';
import cors from 'cors';
import { errorHandler } from './utils/http';
import { createLogger } from './utils/logger';

const httpLogger = createLogger('HTTP');

export interface AppDependencies {
  apiRouter: Router;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (res.statusCode < 400) return;
      httpLogger.warn(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'phantoma-profile-server' });
  });

  app.use('/api/v1', deps.apiRouter);
  app.use(errorHandler);

  return app;
}