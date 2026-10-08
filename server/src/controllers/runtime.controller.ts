/**
 * ------------------------------------------------------------------
 * Runtime Controller
 * ------------------------------------------------------------------
 * REST endpoints thay thế Electron IPC handlers cho việc khởi động/
 * dừng target + điều khiển proxy/CDP. Mỗi handler tương ứng 1-1 với
 * IPC channel cũ (app:launch, target:start-cli-*, proxy:create-session...).
 * ------------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';
import { json, fail } from '../utils/response';
import {
  launchApp,
  launchCliWithEbpf,
  launchCliWithPacketCapture,
  launchCliWithDebugMode,
  launchCliWithCdp,
  stopCliCapture,
} from '../runtime/app-launcher';
import { proxyManager } from '../runtime/proxy/ProxyManager';
import { cdpManager } from '../runtime/cdp/cdp-manager';
import { appState } from '../runtime/state';
import {
  registerTargetMetadata,
  unregisterTargetMetadata,
  listTargetMetadata,
} from '../runtime/target-metadata';
import { sseHub } from '../runtime/sse-hub';
import { handleInspectorRequest } from '../runtime/inspector';
import {
  spawnTerminal,
  writeTerminal,
  resizeTerminal,
  killTerminal,
} from '../runtime/terminal-manager';
import { execCommand } from '../runtime/command-executor';
import { mobileRuntime } from '../runtime/mobile/mobile-runtime';

export const runtimeController = {
  // ── App launch/terminate ────────────────────────────────────────
  async launch(req: Request, res: Response, next: NextFunction) {
    try {
      const { appName, proxyUrl, customUrl, mode, useEnvInject, targetId, useSandbox } = req.body;
      if (!appName) return fail(res, 400, 'appName is required');

      const ok = await launchApp(
        appName,
        proxyUrl || '',
        customUrl,
        mode,
        useEnvInject,
        targetId,
        useSandbox,
      );
      json(res, 200, { success: ok });
    } catch (err) {
      next(err);
    }
  },

  async terminate(_req: Request, res: Response, next: NextFunction) {
    try {
      if (appState.activeChildProcess) {
        appState.activeChildProcess.kill();
        appState.activeChildProcess = null;
      }
      if (appState.activeProxyUrl) {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        execAsync(`pkill -f -- "--proxy-server=${appState.activeProxyUrl}"`).catch(() => {});
        appState.activeProxyUrl = null;
      }
      json(res, 200, { success: true });
    } catch (err) {
      next(err);
    }
  },

  // ── Target metadata registry ────────────────────────────────────
  registerTarget(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetId, title, favicon, platform, url } = req.body;
      if (!targetId) return fail(res, 400, 'targetId is required');
      registerTargetMetadata({ id: targetId, title, favicon, platform, url });
      json(res, 200, { success: true });
    } catch (err) {
      next(err);
    }
  },

  unregisterTarget(req: Request, res: Response, next: NextFunction) {
    try {
      unregisterTargetMetadata(req.params.targetId);
      json(res, 200, { success: true });
    } catch (err) {
      next(err);
    }
  },

  listRunning(_req: Request, res: Response, next: NextFunction) {
    try {
      const running: any[] = [];
      appState.targetProcesses.forEach((proc, targetId) => {
        if (proc && !proc.killed) {
          const meta = listTargetMetadata().find((m) => m.id === targetId);
          running.push(meta || { id: targetId, title: targetId });
        }
      });
      json(res, 200, { targets: running });
    } catch (err) {
      next(err);
    }
  },

  // ── CLI capture methods ─────────────────────────────────────────
  async startCliEbpf(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetId, executablePath, useSandbox } = req.body;
      const ok = await launchCliWithEbpf(executablePath, targetId, undefined, useSandbox);
      json(res, 200, { success: ok });
    } catch (err) {
      next(err);
    }
  },

  async startCliPcap(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetId, executablePath, useSandbox } = req.body;
      const ok = await launchCliWithPacketCapture(executablePath, targetId, undefined, useSandbox);
      json(res, 200, { success: ok });
    } catch (err) {
      next(err);
    }
  },

  async startCliDebug(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetId, executablePath, useSandbox } = req.body;
      const ok = await launchCliWithDebugMode(executablePath, targetId, undefined, useSandbox);
      json(res, 200, { success: ok });
    } catch (err) {
      next(err);
    }
  },

  async startCliCdp(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetId, executablePath, useSandbox } = req.body;
      const ok = await launchCliWithCdp(executablePath, targetId, undefined, useSandbox);
      json(res, 200, { success: ok });
    } catch (err) {
      next(err);
    }
  },

  stopCliCapture(req: Request, res: Response, next: NextFunction) {
    try {
      stopCliCapture(req.params.targetId);
      json(res, 200, { success: true });
    } catch (err) {
      next(err);
    }
  },

  // ── Proxy session ───────────────────────────────────────────────
  async createProxySession(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return fail(res, 400, 'sessionId is required');
      const port = await proxyManager.createSession(sessionId);
      json(res, 200, { port });
    } catch (err) {
      next(err);
    }
  },

  async destroyProxySession(req: Request, res: Response, next: NextFunction) {
    try {
      await proxyManager.stopSession(req.body.sessionId);
      json(res, 200, { success: true });
    } catch (err) {
      next(err);
    }
  },

  async stopAllProxy(_req: Request, res: Response, next: NextFunction) {
    try {
      await proxyManager.stopAll();
      json(res, 200, { success: true });
    } catch (err) {
      next(err);
    }
  },

  setIntercept(req: Request, res: Response, next: NextFunction) {
    try {
      const { enabled, appId } = req.body;
      const result = appId
        ? proxyManager.setIntercept(appId, enabled)
        : proxyManager.setInterceptAll(enabled);
      json(res, 200, { success: result });
    } catch (err) {
      next(err);
    }
  },

  setBreakpointRules(req: Request, res: Response, next: NextFunction) {
    try {
      proxyManager.setBreakpointRules(req.body.rules || []);
      json(res, 200, { success: true });
    } catch (err) {
      next(err);
    }
  },

  resolveBreakpoint(req: Request, res: Response, next: NextFunction) {
    try {
      const { requestId, edited } = req.body;
      const result = proxyManager.resolveBreakpoint(requestId, edited);
      json(res, 200, { success: result });
    } catch (err) {
      next(err);
    }
  },

  async forwardRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await proxyManager.forwardRequest(req.body.id);
      json(res, 200, { success: result });
    } catch (err) {
      next(err);
    }
  },

  async dropRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await proxyManager.dropRequest(req.body.id);
      json(res, 200, { success: result });
    } catch (err) {
      next(err);
    }
  },

  // ── CDP ─────────────────────────────────────────────────────────
  async cdpConnect(req: Request, res: Response, next: NextFunction) {
    try {
      const { port } = req.body;
      const success = await cdpManager.connect(port);
      json(res, 200, { success, port });
    } catch (err) {
      next(err);
    }
  },

  cdpDisconnect(_req: Request, res: Response, next: NextFunction) {
    try {
      cdpManager.cleanup();
      json(res, 200, { success: true });
    } catch (err) {
      next(err);
    }
  },

  cdpState(_req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, { connected: cdpManager.isConnected });
    } catch (err) {
      next(err);
    }
  },

  async cdpNavigate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cdpManager.navigate(req.body.url);
      json(res, 200, { success: result });
    } catch (err) {
      next(err);
    }
  },

  async cdpReload(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cdpManager.reload();
      json(res, 200, { success: result });
    } catch (err) {
      next(err);
    }
  },

  async cdpInjectBorder(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cdpManager.injectMonitoringBorder();
      json(res, 200, { success: result });
    } catch (err) {
      next(err);
    }
  },

  async cdpRemoveBorder(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cdpManager.removeMonitoringBorder();
      json(res, 200, { success: result });
    } catch (err) {
      next(err);
    }
  },

  // ── SSE ─────────────────────────────────────────────────────────
  sse(req: Request, res: Response) {
    sseHub.handleConnection(req, res);
  },

  sseStats(_req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, { clients: sseHub.clientCount });
    } catch (err) {
      next(err);
    }
  },

  // ── Inspector (send-request) ────────────────────────────────────
  async inspectorSend(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await handleInspectorRequest(req.body);
      json(res, 200, result);
    } catch (err) {
      next(err);
    }
  },

  // ── Command execution ───────────────────────────────────────────
  async execCommand(req: Request, res: Response, next: NextFunction) {
    try {
      const { command, cwd } = req.body;
      if (!command) return fail(res, 400, 'command is required');
      const result = await execCommand(command, cwd || process.cwd());
      json(res, 200, result);
    } catch (err) {
      next(err);
    }
  },

  // ── Terminal ────────────────────────────────────────────────────
  terminalSpawn(req: Request, res: Response, next: NextFunction) {
    try {
      const { terminalId, cwd } = req.body;
      if (!terminalId) return fail(res, 400, 'terminalId is required');
      json(res, 200, spawnTerminal(terminalId, cwd));
    } catch (err) {
      next(err);
    }
  },

  terminalWrite(req: Request, res: Response, next: NextFunction) {
    try {
      const { terminalId, data } = req.body;
      writeTerminal(terminalId, data);
      json(res, 200, { success: true });
    } catch (err) {
      next(err);
    }
  },

  terminalResize(req: Request, res: Response, next: NextFunction) {
    try {
      const { terminalId, cols, rows } = req.body;
      resizeTerminal(terminalId, cols, rows);
      json(res, 200, { success: true });
    } catch (err) {
      next(err);
    }
  },

  terminalKill(req: Request, res: Response, next: NextFunction) {
    try {
      killTerminal(req.params.terminalId);
      json(res, 200, { success: true });
    } catch (err) {
      next(err);
    }
  },

  // ── Mobile ──────────────────────────────────────────────────────
  async mobileCheckTools(_req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.checkTools());
    } catch (err) {
      next(err);
    }
  },

  async mobileCheckAdb(_req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.checkAdb());
    } catch (err) {
      next(err);
    }
  },

  async mobileConnectWireless(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.connectWireless(req.body.ip, req.body.port));
    } catch (err) {
      next(err);
    }
  },

  async mobileEnableWirelessAdb(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.enableWirelessAdb(req.body.serial));
    } catch (err) {
      next(err);
    }
  },

  async mobileDetectEmulators(_req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.detectEmulators());
    } catch (err) {
      next(err);
    }
  },

  async mobileGetEmulatorDetails(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.getEmulatorDetails(req.params.serial));
    } catch (err) {
      next(err);
    }
  },

  async mobileListGenymotionVms(_req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.listGenymotionVMs());
    } catch (err) {
      next(err);
    }
  },

  async mobileLaunchGenymotion(req: Request, res: Response, next: NextFunction) {
    try {
      const { profileId, proxyHost, proxyPort } = req.body;
      json(res, 200, await mobileRuntime.launchGenymotion(profileId, proxyHost, proxyPort));
    } catch (err) {
      next(err);
    }
  },

  async mobileLaunchWaydroid(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.launchWaydroid(req.body.proxyHost, req.body.proxyPort));
    } catch (err) {
      next(err);
    }
  },

  async mobileCheckFrida(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.checkFrida(req.body.serial));
    } catch (err) {
      next(err);
    }
  },

  async mobileInstallFrida(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.installFrida(req.body.serial));
    } catch (err) {
      next(err);
    }
  },

  async mobileStartFrida(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.startFrida(req.body.serial));
    } catch (err) {
      next(err);
    }
  },

  async mobileStopFrida(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.stopFrida(req.body.serial));
    } catch (err) {
      next(err);
    }
  },

  async mobileInjectSslBypass(req: Request, res: Response, next: NextFunction) {
    try {
      const { serial, packageName } = req.body;
      json(res, 200, await mobileRuntime.injectSslBypass(serial, packageName));
    } catch (err) {
      next(err);
    }
  },

  async mobileInjectCustomScript(req: Request, res: Response, next: NextFunction) {
    try {
      const { serial, packageName, script } = req.body;
      json(res, 200, await mobileRuntime.injectCustomScript(serial, packageName, script));
    } catch (err) {
      next(err);
    }
  },

  async mobileListProcesses(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.listProcesses(req.body.serial));
    } catch (err) {
      next(err);
    }
  },

  async mobileStopEmulator(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.stopEmulator(req.body.vmName, req.body.type));
    } catch (err) {
      next(err);
    }
  },

  async mobileConfigureProxy(req: Request, res: Response, next: NextFunction) {
    try {
      const { serial, proxyHost, proxyPort, fallbackName } = req.body;
      json(res, 200, await mobileRuntime.configureProxy(serial, proxyHost, proxyPort, fallbackName));
    } catch (err) {
      next(err);
    }
  },

  async mobileClearProxy(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.clearProxy(req.body.serial, req.body.fallbackName));
    } catch (err) {
      next(err);
    }
  },

  async mobileSetupCompleteProxy(req: Request, res: Response, next: NextFunction) {
    try {
      const { serial, proxyHost, proxyPort, fallbackName } = req.body;
      json(
        res,
        200,
        await mobileRuntime.setupCompleteProxy(serial, proxyHost, proxyPort, fallbackName),
      );
    } catch (err) {
      next(err);
    }
  },

  async mobileInstallCaCert(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.installCaCert(req.body.serial));
    } catch (err) {
      next(err);
    }
  },

  async mobileInstallApk(req: Request, res: Response, next: NextFunction) {
    try {
      const { serial, apkPath } = req.body;
      json(res, 200, await mobileRuntime.installApk(serial, apkPath));
    } catch (err) {
      next(err);
    }
  },

  async mobileUninstallApp(req: Request, res: Response, next: NextFunction) {
    try {
      const { serial, packageName } = req.body;
      json(res, 200, await mobileRuntime.uninstallApp(serial, packageName));
    } catch (err) {
      next(err);
    }
  },

  async mobileLaunchApp(req: Request, res: Response, next: NextFunction) {
    try {
      const { serial, packageName } = req.body;
      json(res, 200, await mobileRuntime.launchApp(serial, packageName));
    } catch (err) {
      next(err);
    }
  },

  async mobileStopApp(req: Request, res: Response, next: NextFunction) {
    try {
      const { serial, packageName } = req.body;
      json(res, 200, await mobileRuntime.stopApp(serial, packageName));
    } catch (err) {
      next(err);
    }
  },

  async mobileCheckAppInstalled(req: Request, res: Response, next: NextFunction) {
    try {
      const { serial, packageName } = req.body;
      json(res, 200, await mobileRuntime.isAppInstalled(serial, packageName));
    } catch (err) {
      next(err);
    }
  },

  async mobileListPackages(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.listPackages(req.body.serial));
    } catch (err) {
      next(err);
    }
  },

  mobileGetProfiles(_req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, mobileRuntime.getProfiles());
    } catch (err) {
      next(err);
    }
  },

  mobileGetProfile(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, mobileRuntime.getProfile(req.params.profileId));
    } catch (err) {
      next(err);
    }
  },

  mobileCreateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, mobileRuntime.createProfile(req.body));
    } catch (err) {
      next(err);
    }
  },

  mobileUpdateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, mobileRuntime.updateProfile(req.params.profileId, req.body));
    } catch (err) {
      next(err);
    }
  },

  mobileDeleteProfile(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, mobileRuntime.deleteProfile(req.params.profileId));
    } catch (err) {
      next(err);
    }
  },

  async mobileStartLogcat(req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, await mobileRuntime.startLogcat(req.body.serial));
    } catch (err) {
      next(err);
    }
  },

  mobileStopLogcat(_req: Request, res: Response, next: NextFunction) {
    try {
      json(res, 200, mobileRuntime.stopLogcat());
    } catch (err) {
      next(err);
    }
  },
};