import express from 'express';
import cors from 'cors';
import { getConfig } from './config/server.config';
import { init as initDb, close as closeDb } from './database/connection';
import { registerRoutes } from './routes/routes';
import { errorHandler } from './utils/http';

const app = express();

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '50mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'phantoma-code-server' });
});

function bootstrap(): void {
  try {
    const cfg = getConfig();
    initDb(cfg.dbPath);
    app.use('/api/v1', registerRoutes());
    app.use(errorHandler);

    const server = app.listen(cfg.port, () => {});

    const shutdown = () => {
      server.close();
      closeDb();
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[Code] Failed to start', error);
    process.exit(1);
  }
}

bootstrap();
