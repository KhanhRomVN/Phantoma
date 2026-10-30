/**
 * ------------------------------------------------------------------
 * Phantoma Emulate Service
 * ------------------------------------------------------------------
 * Unified service for Traffic Interception + Emulate CRUD API.
 * Combines the former Interceptor logic with the Emulate Target/Filter/
 * Repeater/Report management previously housed in Phantoma/server.
 * ------------------------------------------------------------------
 */

import express from 'express';
import http from 'http'; // Added for WebSocket integration
import cors from 'cors';
import dotenv from 'dotenv';
import { logger, createLogger } from './utils/logger';
import { proxyManager } from './core/proxy-manager';
import { BreakpointRule } from './core/proxy-server';
// import { sseHub } from './core/sse-hub'; // Deprecated in favor of WSS
import { wssHub } from './services/wss-hub.service'; // New WebSocket Hub
import { init as initDb, close as closeDb } from './database/connection';
import { getConfig } from './config/server.config';
import { registerEmulateRoutes } from './routes/routes';
import { TargetRepository } from './repositories/target.repository';
import { FilterRepository } from './repositories/filter.repository';
import { RepeaterRepository } from './repositories/repeater.repository';
import { ReportRepository } from './repositories/report.repository';
import { TargetService } from './services/target.service';
import { FilterService } from './services/filter.service';
import { RepeaterService } from './services/repeater.service';
import { ReportService } from './services/report.service';
import { errorHandler } from './middleware/error-handler.middleware';
import { showWelcome, printStarted } from './utils/welcome';

// Load environment variables
dotenv.config();

if (!process.env.EMULATE_PORT) throw new Error('EMULATE_PORT is required (no fallback)');
const DEFAULT_PORT = parseInt(process.env.EMULATE_PORT, 10);
const app = express();
const startupLogger = createLogger('Startup');

// Global middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'phantoma-emulate-service' });
});

// --- API Endpoints for Proxy Control ---

// Create a new proxy session
app.post('/sessions', async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  try {
    const port = await proxyManager.createSession(id);
    res.json({ success: true, sessionId: id, port });
  } catch (err) {
    logger.error('Failed to create session', { err: String(err) });
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Stop a specific session
app.delete('/sessions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await proxyManager.stopSession(id);
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to stop session', { err: String(err) });
    res.status(500).json({ error: 'Failed to stop session' });
  }
});

// Stop all sessions
app.post('/sessions/stop-all', async (_req, res) => {
  try {
    await proxyManager.stopAll();
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to stop all sessions', { err: String(err) });
    res.status(500).json({ error: 'Failed to stop all sessions' });
  }
});

// Toggle intercept mode for a session
app.post('/sessions/:id/intercept', (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;
  const success = proxyManager.setIntercept(id, !!enabled);
  res.json({ success });
});

// Set breakpoint rules globally
app.post('/breakpoints/rules', (req, res) => {
  const rules: BreakpointRule[] = req.body.rules || [];
  proxyManager.setBreakpointRules(rules);
  res.json({ success: true, count: rules.length });
});

// Resolve a pending breakpoint
app.post('/breakpoints/resolve', (req, res) => {
  const { requestId, edited } = req.body;
  const success = proxyManager.resolveBreakpoint(requestId, edited || null);
  res.json({ success });
});

// Forward/Drop a pending request (when in intercept mode)
app.post('/requests/:id/forward', async (req, res) => {
  const { id } = req.params;
  const success = await proxyManager.forwardRequest(id);
  res.json({ success });
});

app.post('/requests/:id/drop', async (req, res) => {
  const { id } = req.params;
  const success = await proxyManager.dropRequest(id);
  res.json({ success });
});

// --- Event Streaming Setup ---

/**
 * Attaches a listener to a specific ProxyServer instance to forward
 * its internal events to the global SSE Hub.
 */
function attachEventListeners(sessionId: string) {
  const session = proxyManager.getSession(sessionId);
  if (!session) return;

  session.server.on('event', (evt: { channel: string; data: any; timestamp: number }) => {
    // Broadcast via WebSocket hub
    wssHub.broadcast({ type: evt.channel, data: evt.data });
  });
}

// Patch createSession to automatically attach event listeners upon creation
const originalCreateSession = proxyManager.createSession.bind(proxyManager);
proxyManager.createSession = async (id: string): Promise<number> => {
  const port = await originalCreateSession(id);
  attachEventListeners(id);
  return port;
};

// ─── Initialize Emulate Routes & Services ──────────────────────────────

function initEmulateRoutes(app: express.Application) {
  const targetRepo = new TargetRepository();
  const filterRepo = new FilterRepository();
  const repeaterRepo = new RepeaterRepository();
  const reportRepo = new ReportRepository();

  const targetSvc = new TargetService(targetRepo);
  const filterSvc = new FilterService(filterRepo);
  const repeaterSvc = new RepeaterService(repeaterRepo);
  const reportSvc = new ReportService(reportRepo);

  const v1 = express.Router();
  v1.use(registerEmulateRoutes(targetSvc, filterSvc, repeaterSvc, reportSvc));
  app.use('/api/v1', v1);
}

// Start the main application
async function bootstrap() {
  try {
    // Show welcome UI and get user-selected address
    const { host, port } = await showWelcome('0.0.0.0', DEFAULT_PORT);

    // 1. Initialize Database
    const cfg = getConfig();
    startupLogger.info('Initializing database...', { path: cfg.dbPath });
    initDb(cfg.dbPath);
    startupLogger.info('Database initialized successfully.');

    // 2. Mount Emulate API Routes
    initEmulateRoutes(app);
    startupLogger.info('Emulate API routes mounted.');

    // 3. Register Error Handler (must be last middleware)
    app.use(errorHandler);

    // 4. Create HTTP Server instance to attach WebSocket
    const server = http.createServer(app);

    // 5. Initialize WebSocket Hub attached to this server
    wssHub.init(server);
    startupLogger.info('WebSocket Hub initialized on /ws/events');

    // 6. Start Listening
    server.listen(port, host, () => {
      printStarted(host, port);
    });

    // Graceful shutdown
    const shutdown = () => {
      wssHub.shutdown();
      closeDb();
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('[Emulate Service] Failed to start service:', error);
    process.exit(1);
  }
}

bootstrap();
