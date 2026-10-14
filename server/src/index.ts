/**
 * ------------------------------------------------------------------
 * Entry Point
 * ------------------------------------------------------------------
 * Boots the Phantoma Express server: loads env, initializes the SQLite
 * database (with automatic migrations), starts the HTTP listener, and
 * registers graceful-shutdown handlers.
 *
 * CLI flags:
 *   --db-path=<path>   override DB_PATH env var at startup
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── Env (side-effect import — must come first) ──
import './env';

// ── External
import http from 'http';
import dns from 'dns';
import net from 'net';

// ── Local
import { getConfig } from './config/server.config';
import { createApp } from './app';
import { createLogger, F } from './utils/logger';
import { showWelcome, printStarted } from './utils/welcome';

// ─── Constants ─────────────────────────────────────────────────────────
const logger = createLogger('Startup');

// ─── Network fix (copied verbatim from AIWeb2API_temp/src/index.ts) ────
// Node 20+ enables autoSelectFamily by default which breaks IPv4-only
// networks common in Vietnam. Disable it globally before any connect().
try {
  if (typeof (net as any).setDefaultAutoSelectFamily === 'function') {
    (net as any).setDefaultAutoSelectFamily(false);
  }
} catch {
  // Older Node without this API — safe to ignore.
}
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const cfg = getConfig();

  // Show welcome UI and get user-selected address
  const { host, port } = await showWelcome('0.0.0.0', cfg.port);

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  // Print started message
  printStarted(host, port);

  // Graceful shutdown
  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
    // Force-exit after 10s if connections hang.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  process.on('unhandledRejection', (reason) => {
    logger.error('[Server] Unhandled promise rejection (kept alive)', F('reason', String(reason)));
  });
  process.on('uncaughtException', (err) => {
    logger.error('[Server] Uncaught exception (kept alive)', F('error', err.message));
  });
}

// ─── CLI entry ─────────────────────────────────────────────────────────

if (require.main === module) {
  main().catch((err) => {
    logger.error('Unhandled startup error', F('error', String(err)));
    process.exit(1);
  });
}
