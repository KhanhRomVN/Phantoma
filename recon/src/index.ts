/**
 * Recon Server
 * Standalone server for browser reconnaissance using CDP
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import browserRoutes from './routes/browser.routes';
import { browserManager } from './services/browser-manager.service';
import { showWelcome, printStarted } from './utils/welcome';

dotenv.config();

const DEFAULT_PORT = parseInt(process.env.RECON_PORT || '3003', 10);
const DEFAULT_HOST = process.env.RECON_HOST || '0.0.0.0';

async function main() {
  // Show welcome UI and get user-selected port
  const { host, port } = await showWelcome(DEFAULT_HOST, DEFAULT_PORT);

  const app = express();

  // Middleware
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'phantoma-recon-service' });
  });

  // API routes
  app.use('/api/browser', browserRoutes);

  // Start server
  app.listen(port, host, () => {
    printStarted(host, port);
  });

  // Graceful shutdown
  const shutdown = async () => {
    await browserManager.closeAll();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[Recon Server] Startup failed:', err);
  process.exit(1);
});
