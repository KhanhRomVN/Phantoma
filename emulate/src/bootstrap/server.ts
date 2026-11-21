/**
 * ------------------------------------------------------------------
 * Server Bootstrap
 * ------------------------------------------------------------------
 * Startup sequence of the Phantoma Emulate Service:
 *
 *   1. Welcome UI  → user confirms host/port
 *   2. Database    → open SQLite + run migrations
 *   3. Container   → wire repositories and services
 *   4. Event bridge→ proxy session events → WebSocket hub
 *   5. HTTP server → Express app + WebSocket hub on the same server
 *   6. Shutdown    → graceful SIGTERM / SIGINT handlers
 * ------------------------------------------------------------------
 */

import http from 'http';
import { createApp } from '../app';
import { getConfig } from '../config';
import { DEFAULT_HOST } from '../constants';
import { close as closeDb, init as initDb } from '../database/sqlite.connection';
import { wssHub } from '../services/realtime/wss-hub.service';
import { printStarted, showWelcome } from '../startup/welcome.screen';
import { createLogger, logger } from '../utils/logger.util';
import { createContainer } from './container';
import { bridgeProxyEventsToHub } from './proxy-event-bridge';

const startupLogger = createLogger('Startup');

function registerShutdownHandlers(): void {
  const shutdown = () => {
    wssHub.shutdown();
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
    const container = createContainer();
    bridgeProxyEventsToHub();
    const app = createApp(container);
    startupLogger.info('Emulate API routes mounted.');

    // 4. Create HTTP server and attach the WebSocket hub to it
    const server = http.createServer(app);
    wssHub.init(server);
    startupLogger.info('WebSocket Hub initialized on /ws/events');

    // 5. Start listening
    server.listen(port, host, () => {
      printStarted(host, port);
    });

    registerShutdownHandlers();
  } catch (error) {
    logger.error('[Emulate Service] Failed to start service:', error);
    process.exit(1);
  }
}
