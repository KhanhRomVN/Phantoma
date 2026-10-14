/**
 * ------------------------------------------------------------------
 * Emulate Routes
 * ------------------------------------------------------------------
 * Ported from internal/routes/emulate.go. Mounts all emulate-related
 * endpoints under /emulate-targets with the exact same URL shapes as
 * the Go server so the existing frontend needs no changes.
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── External
import { Router } from 'express';
import * as fs from 'fs';
import { spawn } from 'child_process';
import * as net from 'net';

// ── Local
import { TargetService } from '../services/target.service';
import { FilterService } from '../services/filter.service';
import { RepeaterService } from '../services/repeater.service';
import { ReportService } from '../services/report.service';
import { createTargetController } from '../controllers/target.controller';
import { createFilterController } from '../controllers/filter.controller';
import { createRepeaterController } from '../controllers/repeater.controller';
import { createReportController } from '../controllers/report.controller';
import { cdpService } from '../services/cdp.service';
import { processManager } from '../services/process-manager.service';
import { ebpfSniffer } from '../services/ebpf-sniffer.service';
import { wssHub } from '../services/wss-hub.service';
import { getCaptureMethodsForPlatform, Platform } from '../config/capture-methods';
import { getCurrentPath, reinit as reinitDb } from '../database/connection';

/**
 * Tìm một cổng TCP trống ngẫu nhiên trong khoảng [minPort, maxPort].
 * Trả về Promise<number> chứa cổng tìm được.
 */
function findFreePort(minPort = 9300, maxPort = 9400): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error('Failed to get port from server address'));
      }
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

// Note: Process management is now handled centrally by processManager service.
// We keep cdpSessionPorts only if needed for quick lookup elsewhere, but mostly redundant now.

// ─── Inline Capture Methods Config (for debugging reliability) ─────────
const METHODS: Record<string, any> = {
  cdp: {
    id: 'cdp',
    label: 'CDP',
    description: 'Chrome DevTools Protocol for debugging and automation',
    icon: 'Monitor',
    color: 'sky-400',
    ratings: { dataQuality: 5, authCompat: 5, complexity: 2 },
    pros: ['Full plaintext access', 'Auth preserved', 'Standard browser integration'],
    cons: ['Browser-specific', 'Requires remote debugging enabled'],
    limitations: 'Only works with Chromium-based browsers.',
  },
  mitm: {
    id: 'mitm-normal',
    label: 'MITM Proxy',
    description: 'Standard MITM proxy interception for traffic analysis',
    icon: 'Shield',
    color: 'amber-400',
    ratings: { dataQuality: 5, authCompat: 2, complexity: 2 },
    pros: ['Full plaintext access', 'Headers & body visible', 'Standard tool'],
    cons: ['Breaks signature validation', 'Auth may fail', 'SSL re-encryption'],
    limitations: 'Cannot preserve auth for apps with certificate pinning.',
  },
};

const PLATFORM_METHODS: Record<Platform, string[]> = {
  web: ['cdp', 'mitm'],
  pc: [], // Tạm thời rỗng theo yêu cầu "các target khác tạm thời chưa có gì"
  android: [],
  cli: [],
};

// ─── Factory ──────────────────────────────────────────────────────────
export function registerEmulateRoutes(
  targetSvc: TargetService,
  filterSvc: FilterService,
  repeaterSvc: RepeaterService,
  reportSvc: ReportService,
): Router {
  const router = Router();

  // Target CLI đang sở hữu eBPF sniffer (để /runtime/terminate dừng đúng sniffer)
  let ebpfOwnerTargetId: string | null = null;

  const targetCtrl = createTargetController(targetSvc);
  const filterCtrl = createFilterController(filterSvc);
  const repeaterCtrl = createRepeaterController(repeaterSvc);
  const reportCtrl = createReportController(reportSvc);

  // Target CRUD
  router.get('/emulate-targets', targetCtrl.list);
  router.post('/emulate-targets', targetCtrl.create);
  router.get('/emulate-targets/:id', targetCtrl.getByID);
  router.put('/emulate-targets/:id', targetCtrl.update);
  router.delete('/emulate-targets/:id', targetCtrl.delete);
  router.post('/emulate-targets/:id/use', targetCtrl.updateLastUsed);

  // Filters
  router.get('/emulate-targets/:id/filter', filterCtrl.getByTargetID);
  router.put('/emulate-targets/:id/filter', filterCtrl.createOrUpdate);
  router.delete('/emulate-targets/:id/filter', filterCtrl.delete);

  // Repeater — Requests
  router.get('/emulate-targets/:targetId/repeater/requests', repeaterCtrl.listRequests);
  router.post('/emulate-targets/:targetId/repeater/requests', repeaterCtrl.createRequest);
  router.get('/emulate-targets/:targetId/repeater/requests/:requestId', repeaterCtrl.getRequest);
  router.put('/emulate-targets/:targetId/repeater/requests/:requestId', repeaterCtrl.updateRequest);
  router.delete(
    '/emulate-targets/:targetId/repeater/requests/:requestId',
    repeaterCtrl.deleteRequest,
  );

  // Repeater — Payloads
  router.get(
    '/emulate-targets/:targetId/repeater/requests/:requestId/payloads',
    repeaterCtrl.listPayloads,
  );
  router.put(
    '/emulate-targets/:targetId/repeater/requests/:requestId/payloads',
    repeaterCtrl.upsertPayload,
  );
  router.delete(
    '/emulate-targets/:targetId/repeater/requests/:requestId/payloads/:payloadId',
    repeaterCtrl.deletePayload,
  );

  // Repeater — History
  router.get('/emulate-targets/:targetId/repeater/history', repeaterCtrl.listHistoryByTarget);
  router.get(
    '/emulate-targets/:targetId/repeater/requests/:requestId/history',
    repeaterCtrl.listHistoryByRequest,
  );
  router.post(
    '/emulate-targets/:targetId/repeater/requests/:requestId/history',
    repeaterCtrl.saveHistory,
  );
  router.get(
    '/emulate-targets/:targetId/repeater/history/:historyId/runs',
    repeaterCtrl.getHistoryRuns,
  );
  router.delete(
    '/emulate-targets/:targetId/repeater/history/:historyId',
    repeaterCtrl.deleteHistory,
  );

  // Reports
  router.get('/emulate-targets/:targetId/reports', reportCtrl.listReports);
  router.post('/emulate-targets/:targetId/reports', reportCtrl.createReport);
  router.get('/emulate-targets/:targetId/reports/:reportId', reportCtrl.getReport);
  router.put('/emulate-targets/:targetId/reports/:reportId', reportCtrl.updateReport);
  router.delete('/emulate-targets/:targetId/reports/:reportId', reportCtrl.deleteReport);

  // Capture Methods Configuration (Static data)
  router.get('/capture-methods/:platform', (req, res) => {
    const platform = req.params.platform as Platform;
    const methods = getCaptureMethodsForPlatform(platform);

    // Debug Log
    console.log(`[Emulate API] GET /capture-methods/${platform}`);
    console.log(
      `[Emulate API] Returning ${methods.length} methods:`,
      methods.map((m) => m.id),
    );

    res.json({ platform, methods });
  });

  // Runtime Launch Endpoint
  router.post('/runtime/launch', async (req, res) => {
    const { targetId, mode, proxyUrl, customUrl } = req.body;

    console.log(`[Emulate API] POST /runtime/launch`);
    console.log(`  - Target ID: ${targetId}`);
    console.log(`  - Mode: ${mode}`);
    console.log(`  - URL: ${customUrl || proxyUrl}`);

    try {
      if (mode === 'cdp') {
        // --- REAL LOGIC FOR LAUNCHING CHROME WITH CDP ---

        // 1. Determine URL to open
        const urlToOpen = customUrl || proxyUrl || 'about:blank';

        // 2. Find a FREE PORT dynamically to avoid conflict with Electron/Vite dev server
        let debugPort: number;
        try {
          debugPort = await findFreePort(9300, 9400);
          console.log(`[CDP Launcher] Allocated free port: ${debugPort}`);
        } catch (err) {
          throw new Error('Failed to allocate a free debugging port.');
        }

        // 3. Find Chrome Executable (Linux specific for now, adjust for Win/Mac if needed)
        const chromePaths = [
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/snap/bin/chromium',
          '/usr/bin/chromium',
        ];

        let chromePath = '';
        for (const p of chromePaths) {
          if (fs.existsSync(p)) {
            chromePath = p;
            break;
          }
        }

        if (!chromePath) {
          throw new Error('Chrome/Chromium executable not found in standard paths.');
        }

        // 4. Spawn Process
        // Note: --user-data-dir ensures a fresh profile instance so it doesn't attach to existing running Chrome
        const userDataDir = `/tmp/phantoma-cdp-${targetId}`;

        const args = [
          `--remote-debugging-port=${debugPort}`,
          `--user-data-dir=${userDataDir}`,
          '--no-first-run',
          '--no-default-browser-check',
          urlToOpen,
        ];

        console.log(`[CDP Launcher] Spawning: ${chromePath} ${args.join(' ')}`);

        const child = spawn(chromePath, args, {
          detached: true, // Detach from parent so it keeps running even if server restarts
          stdio: 'ignore',
        });

        child.unref(); // Allow Node.js to exit independently

        // Register process with central manager
        if (child.pid) {
          processManager.register(targetId, child.pid, debugPort);
          console.log(
            `[CDP Launcher] Registered process for target ${targetId}: port=${debugPort}, pid=${child.pid}`,
          );
        }

        // Wait slightly to ensure browser starts up before responding
        await new Promise((r) => setTimeout(r, 1000));

        return res.json({
          success: true,
          sessionId: `sess_cdp_${targetId}`,
          message: `Chrome launched successfully on port ${debugPort}`,
          metadata: {
            debugPort,
            pid: child.pid,
            url: urlToOpen,
          },
        });
      } else if (mode === 'mitm-normal') {
        // Placeholder for MITM launch logic
        return res.json({
          success: false,
          error: 'MITM launch logic not yet implemented in this route.',
        });
      }

      return res.status(400).json({ error: `Unsupported mode: ${mode}` });
    } catch (err: any) {
      console.error('[CDP Launcher] Failed to launch:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to launch browser',
      });
    }
  });

  // Runtime Terminate Endpoint — delegates to ProcessManager
  router.post('/runtime/terminate', async (req, res) => {
    const { targetId } = req.body ?? {};
    console.log(`[Emulate API] POST /runtime/terminate - Target: ${targetId || 'all'}`);

    try {
      if (targetId) {
        await processManager.terminate(targetId);
      } else {
        await processManager.terminateAll();
      }
      // Dừng eBPF sniffer nếu target bị terminate là target đang sở hữu nó
      if (ebpfOwnerTargetId && (!targetId || targetId === ebpfOwnerTargetId)) {
        ebpfSniffer.stop();
        ebpfOwnerTargetId = null;
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Emulate API] Terminate error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Health Check Endpoint — delegates to ProcessManager
  router.get('/runtime/health', (_req, res) => {
    res.json({
      healthy: true,
      timestamp: Date.now(),
      targets: processManager.getActiveTargets(),
    });
  });
  // Register a target to an active runtime session
  router.post('/runtime/targets/register', async (req, res) => {
    const { targetId, title, favicon, platform, url } = req.body;

    console.log(`[Emulate API] POST /runtime/targets/register`);
    console.log(`  - Target ID: ${targetId}`);
    console.log(`  - Title: ${title}`);
    console.log(`  - Platform: ${platform}`);
    console.log(`  - URL: ${url}`);

    // TODO: Store mapping between targetId and current active sessions/proxies

    res.json({
      success: true,
      message: `Target ${targetId} registered for runtime monitoring.`,
    });
  });

  // Connect to CDP Instance
  router.post('/runtime/cdp/connect', async (req, res) => {
    const { port: requestedPort, targetId, expectedUrl } = req.body;

    // AUTO-DETECT PORT: Retrieve from ProcessManager if available.
    // Falls back to requestedPort or default 9222 if no active process is tracked.
    let actualPort = requestedPort || 9222;
    const activeTargets = processManager.getActiveTargets();
    const trackedTarget = activeTargets.find((t) => t.targetId === targetId);

    if (trackedTarget && trackedTarget.alive) {
      actualPort = trackedTarget.port;
    }

    console.log(`[Emulate API] POST /runtime/cdp/connect`);
    console.log(`  - Requested Port: ${requestedPort}`);
    console.log(`  - Actual Port Used: ${actualPort} (from manager: ${!!trackedTarget})`);
    console.log(`  - Target ID: ${targetId}`);
    console.log(`  - Expected URL: ${expectedUrl || 'None'}`);

    try {
      const success = await cdpService.connect(actualPort, targetId || 'default', expectedUrl);

      if (success) {
        res.json({ success: true, message: `Connected to CDP on port ${actualPort}` });
      } else {
        res.status(500).json({ success: false, error: 'Failed to establish CDP connection' });
      }
    } catch (err: any) {
      console.error('[Emulate API] CDP Connect Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Global SSE Endpoint for All Runtime Events
  // Matches the expectation of runtime-sse-bridge.ts which listens on /events
  router.get('/events', (req, res) => {
    console.log('[Emulate API] GET /events - Establishing global SSE stream...');

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Subscribe to all relevant events emitted by cdpService
    const onCdpRequest = (data: any) => {
      res.write(`event: cdp:request\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const onCdpResponse = (data: any) => {
      res.write(`event: cdp:response\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const onCdpFinished = (data: any) => {
      // Optional: Notify frontend that loading finished if needed
      res.write(`event: cdp:finished\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    cdpService.on('cdp:request', onCdpRequest);
    cdpService.on('cdp:response', onCdpResponse);
    cdpService.on('cdp:finished', onCdpFinished);

    // Send initial heartbeat/connected message
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ status: 'stream_open', timestamp: Date.now() })}\n\n`);

    // Cleanup listeners when client disconnects
    req.on('close', () => {
      console.log('[Emulate API] Global SSE connection closed.');
      cdpService.removeListener('cdp:request', onCdpRequest);
      cdpService.removeListener('cdp:response', onCdpResponse);
      cdpService.removeListener('cdp:finished', onCdpFinished);
    });
  });

  // Disconnect from CDP Instance
  router.post('/runtime/cdp/disconnect', async (req, res) => {
    const { targetId } = req.body;
    console.log(`[Emulate API] POST /runtime/cdp/disconnect - Target: ${targetId}`);

    try {
      await cdpService.disconnect(targetId || 'default');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reload the page attached to a CDP session
  router.post('/runtime/cdp/reload', async (req, res) => {
    const { targetId } = req.body ?? {};
    const key = targetId || 'default';
    console.log(`[Emulate API] POST /runtime/cdp/reload - Target: ${key}`);
    try {
      const ok = await cdpService.reload(key);
      res.json({ success: ok });
    } catch (err: any) {
      console.error('[Emulate API] CDP Reload Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Navigate the attached page to a new URL
  router.post('/runtime/cdp/navigate', async (req, res) => {
    const { targetId, url } = req.body ?? {};
    const key = targetId || 'default';
    if (!url) {
      return res.status(400).json({ success: false, error: 'url is required' });
    }
    console.log(`[Emulate API] POST /runtime/cdp/navigate - Target: ${key}, Url: ${url}`);
    try {
      const ok = await cdpService.navigate(key, url);
      res.json({ success: ok });
    } catch (err: any) {
      console.error('[Emulate API] CDP Navigate Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Inject visual border overlay onto the controlled tab
  router.post('/runtime/cdp/inject-border', async (req, res) => {
    const { targetId, color } = req.body ?? {};
    const key = targetId || 'default';
    console.log(`[Emulate API] POST /runtime/cdp/inject-border - Target: ${key}`);
    try {
      const ok = await cdpService.injectBorder(key, color);
      res.json({ success: ok });
    } catch (err: any) {
      console.error('[Emulate API] CDP Inject Border Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Query current CDP connection state (all sessions or specific target)
  router.get('/runtime/cdp/state', (req, res) => {
    const targetId = typeof req.query.targetId === 'string' ? req.query.targetId : undefined;
    try {
      const state = cdpService.getState(targetId);
      res.json({ success: true, data: state });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Database Path Management ────────────────────────────────────────
  // GET /database/path — trả về đường dẫn SQLite DB hiện tại
  router.get('/database/path', (_req, res) => {
    try {
      const currentPath = getCurrentPath();
      if (!currentPath) {
        return res.status(503).json({ error: 'Database not initialized yet' });
      }
      res.json({ path: currentPath });
    } catch (err: any) {
      console.error('[Emulate API] GET /database/path failed:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /database/path — swap DB file runtime (không cần restart server)
  router.put('/database/path', (req, res) => {
    const { path: newPath } = req.body ?? {};
    if (!newPath || typeof newPath !== 'string') {
      return res.status(400).json({ error: 'path is required and must be a string' });
    }
    try {
      reinitDb(newPath);
      console.log(`[Emulate API] Database swapped to: ${newPath}`);
      res.json({ path: newPath, status: 'ok' });
    } catch (err: any) {
      console.error('[Emulate API] PUT /database/path failed:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ─── eBPF TLS Sniffer Endpoints ──────────────────────────────────────
  
  /**
   * Start capturing plaintext HTTPS traffic using eBPF uprobes.
   * Body: { pid?: number } - Optional filter by Process ID.
   */
  router.post('/runtime/ebpf/start', async (req, res) => {
    const { pid } = req.body ?? {};
    console.log(`[Emulate API] POST /runtime/ebpf/start - PID Filter: ${pid || 'ALL'}`);

    try {
      const success = await ebpfSniffer.start({ pid });
      
      if (success) {
        // Forward events from sniffer to WebSocket Hub for real-time streaming
        ebpfSniffer.on('ebpf:data', (event) => {
          // Emit via global bus so frontend receives it alongside CDP events
          wssHub.broadcast({ type: 'ebpf:https-event', data: event });
        });
        
        ebpfSniffer.on('ebpf:error', (errorData) => {
          wssHub.broadcast({ type: 'ebpf:error', data: errorData });
        });

        res.json({ 
          success: true, 
          message: 'eBPF sniffer started. Capturing SSL/TLS plaintext.',
          filteredByPid: !!pid 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to start eBPF sniffer. Check logs for permission/kernel issues.' 
        });
      }
    } catch (err: any) {
      console.error('[Emulate API] eBPF Start Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Stop the active eBPF capture session.
   */
  router.post('/runtime/ebpf/stop', (_req, res) => {
    console.log(`[Emulate API] POST /runtime/ebpf/stop`);
    try {
      ebpfSniffer.stop();
      res.json({ success: true, message: 'eBPF sniffer stopped.' });
    } catch (err: any) {
      console.error('[Emulate API] eBPF Stop Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Get current status of the eBPF sniffer.
   */
  router.get('/runtime/ebpf/status', (_req, res) => {
    res.json({ 
      running: ebpfSniffer.getStatus(),
      timestamp: Date.now()
    });
  });

  // ─── CLI eBPF Capture Endpoints ──────────────────────────────────────

  /**
   * Launch a CLI target and attach the eBPF TLS sniffer to its PID.
   * Body: { targetId: string, executablePath: string, useSandbox?: boolean }
   * (executablePath holds the full command line stored for the CLI target.)
   */
  router.post('/runtime/cli/ebpf', async (req, res) => {
    const { targetId, executablePath, sudoPassword } = req.body ?? {};
    console.log(`[Emulate API] POST /runtime/cli/ebpf - Target: ${targetId}`);

    if (!targetId || !executablePath) {
      return res
        .status(400)
        .json({ success: false, error: 'targetId and executablePath are required' });
    }
    if (ebpfSniffer.getStatus()) {
      return res
        .status(409)
        .json({ success: false, error: 'eBPF sniffer is already running. Stop it first.' });
    }
    if (processManager.getActiveTargets().some((t) => t.targetId === targetId && t.alive)) {
      return res
        .status(409)
        .json({ success: false, error: `Target ${targetId} is already running` });
    }

    try {
      // `exec` replaces the shell so child.pid is the real CLI process that ecapture must attach to.
      // Single simple command only — upgrade path: parse the command line to support pipes and &&.
      const child = spawn('sh', ['-c', `exec ${executablePath}`], {
        detached: true, // own process group so processManager.terminate() can kill -pid
        stdio: 'ignore',
      });
      child.on('error', (err) => {
        console.error(`[Emulate API] CLI spawn error for ${targetId}:`, err.message);
      });
      child.unref();

      if (!child.pid) {
        return res.status(500).json({ success: false, error: 'Failed to spawn CLI command' });
      }
      const pid = child.pid;
      processManager.register(targetId, pid, 0);

      // Drop old listeners first so restarts do not duplicate forwarded events
      ebpfSniffer.removeAllListeners('ebpf:data');
      ebpfSniffer.removeAllListeners('ebpf:error');
      ebpfSniffer.on('ebpf:data', (event) => {
        wssHub.broadcast({ type: 'ebpf:https-event', data: event });
      });
      ebpfSniffer.on('ebpf:error', (errorData) => {
        wssHub.broadcast({ type: 'ebpf:error', data: errorData });
      });

      let earlyError = '';
      const captureEarlyError = (e: { message?: string }) => {
        earlyError = e?.message || earlyError;
      };
      ebpfSniffer.on('ebpf:error', captureEarlyError);

      const started = await ebpfSniffer.start({ pid, sudoPassword });
      // ecapture runs via sudo and may exit right after spawn — wait briefly to catch that
      await new Promise((r) => setTimeout(r, 1500));
      ebpfSniffer.off('ebpf:error', captureEarlyError);

      if (!started || !ebpfSniffer.getStatus()) {
        await processManager.terminate(targetId);
        return res.status(500).json({
          success: false,
          error:
            earlyError ||
            'ecapture failed to start or exited immediately. Check that ecapture is installed and sudo works without a password.',
        });
      }

      ebpfOwnerTargetId = targetId;
      return res.json({
        success: true,
        message: `CLI target launched (PID ${pid}) with eBPF capture attached.`,
        metadata: { pid },
      });
    } catch (err: any) {
      console.error('[Emulate API] CLI eBPF start error:', err);
      await processManager.terminate(targetId).catch(() => false);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Stop the eBPF sniffer and terminate the CLI target process.
   */
  router.post('/runtime/cli/:targetId/stop', async (req, res) => {
    const { targetId } = req.params;
    console.log(`[Emulate API] POST /runtime/cli/${targetId}/stop`);

    try {
      ebpfSniffer.stop();
      ebpfOwnerTargetId = null;
      await processManager.terminate(targetId);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[Emulate API] CLI stop error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
