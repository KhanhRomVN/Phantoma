/**
 * ------------------------------------------------------------------
 * Entry Point
 * ------------------------------------------------------------------
 * Khởi động Phantoma Express server: nạp env, hiển thị Welcome UI để chọn
 * host/port, dựng DI container, mở HTTP listener và đăng ký graceful shutdown.
 * ------------------------------------------------------------------
 */

// ── Config (side-effect import — nạp .env, phải đứng đầu) ──
import { config } from './config';

// ── Local ──
import {
  applyNetworkDefaults,
  registerProcessGuards,
  registerShutdownHandlers,
  startServer,
} from './bootstrap/server';
import { createContainer } from './bootstrap/container';
import { DEFAULT_HOST } from './constants';
import { printStarted, showWelcome } from './startup/welcome.screen';
import { errorMessage } from './utils/error.util';
import { createLogger, F } from './utils/logger.util';

const logger = createLogger('Startup');

async function main(): Promise<void> {
  applyNetworkDefaults();

  const container = createContainer();
  const { host, port } = await showWelcome(DEFAULT_HOST, config.port, container.preferences);

  const server = await startServer(container, host, port);
  printStarted(host, port);

  container.browserUpdate
    .autoInstallIfMissing()
    .catch((err) => logger.warn('Auto-install browser failed', F('error', errorMessage(err))));

  registerShutdownHandlers(server, container);
  registerProcessGuards();
}

if (require.main === module) {
  main().catch((err) => {
    logger.error('Unhandled startup error', F('error', errorMessage(err)));
    process.exit(1);
  });
}
