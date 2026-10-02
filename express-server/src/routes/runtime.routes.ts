/**
 * ------------------------------------------------------------------
 * Runtime Routes
 * ------------------------------------------------------------------
 * REST + SSE endpoints thay thế Electron IPC cho việc điều khiển
 * runtime target/proxy/CDP. Mounted under /api/v1/runtime.
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { runtimeController as c } from '../controllers/runtime.controller';

export function registerRuntimeRoutes(): Router {
  const router = Router();

  // SSE event stream
  router.get('/events', c.sse);
  router.get('/sse-stats', c.sseStats);

  // App lifecycle
  router.post('/launch', c.launch);
  router.post('/terminate', c.terminate);

  // Target metadata
  router.post('/targets/register', c.registerTarget);
  router.delete('/targets/:targetId', c.unregisterTarget);
  router.get('/targets/running', c.listRunning);

  // CLI capture
  router.post('/cli/ebpf', c.startCliEbpf);
  router.post('/cli/pcap', c.startCliPcap);
  router.post('/cli/debug', c.startCliDebug);
  router.post('/cli/cdp', c.startCliCdp);
  router.post('/cli/:targetId/stop', c.stopCliCapture);

  // Proxy
  router.post('/proxy/sessions', c.createProxySession);
  router.delete('/proxy/sessions', c.destroyProxySession);
  router.post('/proxy/stop-all', c.stopAllProxy);
  router.post('/proxy/intercept', c.setIntercept);
  router.post('/proxy/breakpoint-rules', c.setBreakpointRules);
  router.post('/proxy/resolve-breakpoint', c.resolveBreakpoint);
  router.post('/proxy/forward', c.forwardRequest);
  router.post('/proxy/drop', c.dropRequest);

  // CDP
  router.post('/cdp/connect', c.cdpConnect);
  router.post('/cdp/disconnect', c.cdpDisconnect);
  router.get('/cdp/state', c.cdpState);
  router.post('/cdp/navigate', c.cdpNavigate);
  router.post('/cdp/reload', c.cdpReload);
  router.post('/cdp/inject-border', c.cdpInjectBorder);
  router.post('/cdp/remove-border', c.cdpRemoveBorder);

  // Inspector
  router.post('/inspector/send-request', c.inspectorSend);

  // Command execution
  router.post('/exec', c.execCommand);

  // Terminal
  router.post('/terminal/spawn', c.terminalSpawn);
  router.post('/terminal/write', c.terminalWrite);
  router.post('/terminal/resize', c.terminalResize);
  router.delete('/terminal/:terminalId', c.terminalKill);

  // Mobile — system/tools
  router.get('/mobile/tools', c.mobileCheckTools);
  router.get('/mobile/adb', c.mobileCheckAdb);
  router.post('/mobile/wireless/connect', c.mobileConnectWireless);
  router.post('/mobile/wireless/enable', c.mobileEnableWirelessAdb);

  // Mobile — emulator
  router.get('/mobile/emulators', c.mobileDetectEmulators);
  router.get('/mobile/emulators/:serial', c.mobileGetEmulatorDetails);
  router.get('/mobile/genymotion/vms', c.mobileListGenymotionVms);
  router.post('/mobile/genymotion/launch', c.mobileLaunchGenymotion);
  router.post('/mobile/waydroid/launch', c.mobileLaunchWaydroid);
  router.post('/mobile/emulators/stop', c.mobileStopEmulator);

  // Mobile — frida device
  router.post('/mobile/frida/check', c.mobileCheckFrida);
  router.post('/mobile/frida/install', c.mobileInstallFrida);
  router.post('/mobile/frida/start', c.mobileStartFrida);
  router.post('/mobile/frida/stop', c.mobileStopFrida);
  router.post('/mobile/frida/inject-ssl-bypass', c.mobileInjectSslBypass);
  router.post('/mobile/frida/inject-custom', c.mobileInjectCustomScript);
  router.post('/mobile/frida/processes', c.mobileListProcesses);

  // Mobile — proxy config
  router.post('/mobile/proxy/configure', c.mobileConfigureProxy);
  router.post('/mobile/proxy/clear', c.mobileClearProxy);
  router.post('/mobile/proxy/setup-complete', c.mobileSetupCompleteProxy);
  router.post('/mobile/proxy/install-ca', c.mobileInstallCaCert);

  // Mobile — app management
  router.post('/mobile/apps/install', c.mobileInstallApk);
  router.post('/mobile/apps/uninstall', c.mobileUninstallApp);
  router.post('/mobile/apps/launch', c.mobileLaunchApp);
  router.post('/mobile/apps/stop', c.mobileStopApp);
  router.post('/mobile/apps/check', c.mobileCheckAppInstalled);
  router.post('/mobile/apps/list', c.mobileListPackages);

  // Mobile — profiles
  router.get('/mobile/profiles', c.mobileGetProfiles);
  router.get('/mobile/profiles/:profileId', c.mobileGetProfile);
  router.post('/mobile/profiles', c.mobileCreateProfile);
  router.put('/mobile/profiles/:profileId', c.mobileUpdateProfile);
  router.delete('/mobile/profiles/:profileId', c.mobileDeleteProfile);

  // Mobile — logcat
  router.post('/mobile/logcat/start', c.mobileStartLogcat);
  router.post('/mobile/logcat/stop', c.mobileStopLogcat);

  return router;
}