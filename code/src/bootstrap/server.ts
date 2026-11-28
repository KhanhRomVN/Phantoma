/**
 * ------------------------------------------------------------------
 * Server Bootstrap
 * ------------------------------------------------------------------
 * Startup sequence of the Phantoma Code Service:
 *
 *   1. Welcome UI  → user confirms host/port
 *   2. Database    → open SQLite + run migrations
 *   3. Container   → wire repositories and services
 *   4. HTTP server → Express app
 *   5. Shutdown    → graceful SIGTERM / SIGINT handlers
 * ------------------------------------------------------------------
 */

import { getConfig } from '../config/server.config';
import { init as initDb, close as closeDb } from '../infrastructure/persistence/sqlite/connection';
import { runStartupTasks } from '../startup/startup.runner';
import { createApp } from '../app';
import { createContainer } from './container';
import { showWelcome, printStarted } from '../startup/welcome.screen';
import { DEFAULT_HOST } from '../constants';
import { createLogger } from '../utils/logger.util';

const startupLogger = createLogger('Startup');

function registerShutdownHandlers(server: any): void {
  const shutdown = () => {
    server.close();
    closeDb();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export async function startServer(): Promise<void> {
  try {
    // 1. Show welcome UI and get user-selected address
    const cfg = getConfig();
    const { host, port } = await showWelcome(DEFAULT_HOST, cfg.port);

    // 2. Initialize database
    startupLogger.info('Initializing database...', { path: cfg.dbPath });
    initDb(cfg.dbPath);
    startupLogger.info('Database initialized successfully.');

    // 3. Wire dependencies and build the Express app
    const container = createContainer(cfg.dataDir);
    const app = createApp(container.apiControllers);
    startupLogger.info('Code API routes mounted.');

    // 4. Start listening
    const server = app.listen(port, host, () => {
      printStarted(host, port);
      void runStartupTasks(container.startupTasks);
    });

    registerShutdownHandlers(server);
  } catch (error) {
    startupLogger.error('[Code Service] Failed to start service:', error);
    process.exit(1);
  }
}