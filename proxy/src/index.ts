import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getConfig } from './config/server.config';
import { init as initDb, close as closeDb } from './database/connection';
import { registerRoutes } from './routes/routes';
import { monitorService } from './services/monitor.service';
import { sourceService } from './services/source.service';
import { vpnService } from './services/vpn.service';
import { warpService } from './services/warp.service';
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
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.originalUrl === '/health') return;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`;
    if (res.statusCode >= 400) httpLogger.warn(line);
    else httpLogger.info(line);
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'phantoma-proxy-server' });
});

function bootstrap(): void {
  try {
    printBanner();
    const cfg = getConfig();
    initDb(cfg.dbPath);
    logger.info(`Database ready at ${cfg.dbPath}`);
    sourceService.ensureDefault();
    warpService.ensureSource();
    warpService.purgeAccounts();
    vpnService.ensureDefaults();

    app.use('/api/v1', registerRoutes());
    app.use(errorHandler);

    const server = app.listen(cfg.port, () => {
      printStarted(cfg.port, cfg.dataDir);
      monitorService.start();
    });

    const shutdown = (): void => {
      logger.info('Shutting down');
      monitorService.stop();
      vpnService.stopAll();
      server.close();
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

bootstrap();