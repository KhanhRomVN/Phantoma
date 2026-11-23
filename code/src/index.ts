import express from 'express';
import cors from 'cors';
import { getConfig } from './config/server.config';
import { init as initDb, close as closeDb } from './database/connection';
import { registerRoutes } from './routes/routes';
import { errorHandler } from './utils/http';
import { requireToken } from './http/auth';
import { registerRootProvider } from './http/guard';
import { worktreeRepository } from './repositories/worktree.repository';
import { scopeService } from './services/scope.service';

const app = express();

function bootstrap(): void {
  try {
    const cfg = getConfig();

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

    initDb(cfg.dbPath);
    registerRootProvider(() => worktreeRepository.listAll().map((w) => w.path));
    app.use('/api/v1', requireToken(cfg.token), registerRoutes());
    app.use(errorHandler);

    const server = app.listen(cfg.port, cfg.host, () => {
      void scopeService
        .purgeAllDefaultBranches()

        .catch((err) => console.warn('[Code] scope startup sweep failed', err));
    });

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