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

// ─── Imports ────────────────────────────────────────────────────────────
// ── Env (side-effect import — must come first) ──
import './env';

// ── External 
import http from 'http';
import dns from 'dns';
import net from 'net';

// ── Local 
import { getConfig } from './config/server.config';
import { init, close } from './database/connection';
import { createApp } from './app';
import { createLogger, F } from './utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────
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

async function main(options?: { dbPath?: string }): Promise<void> {
  const cfg = getConfig();
  const dbPath = options?.dbPath || cfg.dbPath;

  try {
    init(dbPath);
  } catch (err) {
    logger.error('Failed to initialize database', F('error', String(err)));
    process.exit(1);
  }

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(cfg.port, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  logger.info(`Phantoma server listening`, F('port', cfg.port), F('env', cfg.env), F('db', dbPath));

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down...');
    server.close(() => {
      close();
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
  const args = process.argv.slice(2);
  let dbPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--db-path=')) {
      dbPath = arg.split('=')[1];
    } else if (arg === '--db-path' && i + 1 < args.length) {
      dbPath = args[++i];
    }
  }

  main({ dbPath }).catch((err) => {
    logger.error('Unhandled startup error', F('error', String(err)));
    process.exit(1);
  });
}