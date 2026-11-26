import fs from 'fs';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { closeRedis } from './cache/email.cache';
import { getConfig } from './config/server.config';
import { init as initDb, close as closeDb } from './database/connection';
import { migrateLegacyServiceEmails } from './repositories/service_email.repository';
import { browserRunService } from './services/browser-run.service';
import { browserUpdateService } from './services/browser-update.service';
import { sourceService, syncSource } from './services/source.service';
import { registerRoutes } from './routes/routes';
import { errorHandler } from './utils/http';
import { createLogger } from './utils/logger';
import { printBanner, printStarted } from './utils/welcome';

dotenv.config();

const logger = createLogger('Startup');
const httpLogger = createLogger('HTTP');

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

async function bootstrap(): Promise<void> {
  try {
    printBanner();
    const cfg = getConfig();
    initDb(cfg.dbPath);
    migrateLegacyServiceEmails();
    browserRunService.sweepTempDirs();

    await sourceService.reconcile();
    const sources = await sourceService.list();
    if (sources.length === 0) logger.warn('No sources found in database');
    for (const s of sources) {
      const location = s.location ?? '';
      if (location && !fs.existsSync(location)) {
        logger.warn(`Source "${s.name}" folder does not exist: ${location}`);
      } else if (s.type === 'local' && location) {
        await syncSource({ id: s.id, name: s.name, location });
      }
    }

    app.use('/api/v1', registerRoutes());

    app.use(errorHandler);

    const server = app.listen(cfg.port, () => {
      printStarted(cfg.port, cfg.dataDir);
      browserUpdateService
        .autoInstallIfMissing()
        .catch((err) => logger.warn('Auto-install browser failed', err));
    });

    const shutdown = async () => {
      server.close();
      browserRunService.shutdown();
      await closeRedis();
      closeDb();
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start', error);
    process.exit(1);
  }
}

void bootstrap();
