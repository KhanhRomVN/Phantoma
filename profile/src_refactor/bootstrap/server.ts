import { createApp } from '../app';
import { getConfig } from '../config/server.config';
import { init as initDb } from '../database/connection';
import { createStartupRunner } from '../startup/startup.runner';
import { printBanner, printStarted } from '../startup/presentation/server-banner';
import { createLogger } from '../utils/logger';
import { createContainer } from './container';

const logger = createLogger('Startup');

export async function startServer(): Promise<void> {
  try {
    printBanner();
    const cfg = getConfig();
    initDb(cfg.dbPath);

    const container = createContainer(cfg);
    const runner = createStartupRunner(container.startupTasks);
    await runner.run('before-listen');

    const app = createApp({ apiRouter: container.apiRouter });

    const server = app.listen(cfg.port, () => {
      printStarted(cfg.port, cfg.dataDir);
      void runner.run('after-listen');
    });

    const shutdown = async () => {
      server.close();
      await container.close();
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start', error);
    process.exit(1);
  }
}