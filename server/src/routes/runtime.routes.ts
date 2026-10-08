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
  const rt = '/runtime'; // Prefix to match renderer's BASE='/api/v1/runtime'

  // SSE event stream
  router.get(`${rt}/events`, c.sse);
  router.get(`${rt}/sse-stats`, c.sseStats);

  // App lifecycle
  router.post(`${rt}/launch`, c.launch);
  router.post(`${rt}/terminate`, c.terminate);

  // Target metadata
  router.post(`${rt}/targets/register`, c.registerTarget);
  router.delete(`${rt}/targets/:targetId`, c.unregisterTarget);
  router.get(`${rt}/targets/running`, c.listRunning);

  // CLI capture
  router.post(`${rt}/cli/ebpf`, c.startCliEbpf);
  router.post(`${rt}/cli/pcap`, c.startCliPcap);
  router.post(`${rt}/cli/debug`, c.startCliDebug);
  router.post(`${rt}/cli/cdp`, c.startCliCdp);
  router.post(`${rt}/cli/:targetId/stop`, c.stopCliCapture);

  // Proxy
  router.post(`${rt}/proxy/sessions`, c.createProxySession);
  router.delete(`${rt}/proxy/sessions`, c.destroyProxySession);
  router.post(`${rt}/proxy/stop-all`, c.stopAllProxy);
  router.post(`${rt}/proxy/intercept`, c.setIntercept);
  router.post(`${rt}/proxy/breakpoint-rules`, c.setBreakpointRules);
  router.post(`${rt}/proxy/resolve-breakpoint`, c.resolveBreakpoint);
  router.post(`${rt}/proxy/forward`, c.forwardRequest);
  router.post(`${rt}/proxy/drop`, c.dropRequest);

  // CDP
  router.post(`${rt}/cdp/connect`, c.cdpConnect);
  router.post(`${rt}/cdp/disconnect`, c.cdpDisconnect);
  router.get(`${rt}/cdp/state`, c.cdpState);
  router.post(`${rt}/cdp/navigate`, c.cdpNavigate);
  router.post(`${rt}/cdp/reload`, c.cdpReload);
  router.post(`${rt}/cdp/inject-border`, c.cdpInjectBorder);
  router.post(`${rt}/cdp/remove-border`, c.cdpRemoveBorder);

  // Inspector
  router.post(`${rt}/inspector/send-request`, c.inspectorSend);

  // Command execution
  router.post(`${rt}/exec`, c.execCommand);

  // Terminal
  router.post(`${rt}/terminal/spawn`, c.terminalSpawn);
  router.post(`${rt}/terminal/write`, c.terminalWrite);
  router.post(`${rt}/terminal/resize`, c.terminalResize);
  router.delete(`${rt}/terminal/:terminalId`, c.terminalKill);

  // Mobile — system/tools
  router.get(`${rt}/mobile/tools`, c.mobileCheckTools);
  router.get(`${rt}/mobile/adb`, c.mobileCheckAdb);
  router.post(`${rt}/mobile/wireless/connect`, c.mobileConnectWireless);
  router.post(`${rt}/mobile/wireless/enable`, c.mobileEnableWirelessAdb);

  // Mobile — emulator
  router.get(`${rt}/mobile/emulators`, c.mobileDetectEmulators);
  router.get(`${rt}/mobile/emulators/:serial`, c.mobileGetEmulatorDetails);
  router.get(`${rt}/mobile/genymotion/vms`, c.mobileListGenymotionVms);
  router.post(`${rt}/mobile/genymotion/launch`, c.mobileLaunchGenymotion);
  router.post(`${rt}/mobile/waydroid/launch`, c.mobileLaunchWaydroid);
  router.post(`${rt}/mobile/emulators/stop`, c.mobileStopEmulator);

  // Mobile — frida device
  router.post(`${rt}/mobile/frida/check`, c.mobileCheckFrida);
  router.post(`${rt}/mobile/frida/install`, c.mobileInstallFrida);
  router.post(`${rt}/mobile/frida/start`, c.mobileStartFrida);
  router.post(`${rt}/mobile/frida/stop`, c.mobileStopFrida);
  router.post(`${rt}/mobile/frida/inject-ssl-bypass`, c.mobileInjectSslBypass);
  router.post(`${rt}/mobile/frida/inject-custom`, c.mobileInjectCustomScript);
  router.post(`${rt}/mobile/frida/processes`, c.mobileListProcesses);

  // Mobile — proxy config
  router.post(`${rt}/mobile/proxy/configure`, c.mobileConfigureProxy);
  router.post(`${rt}/mobile/proxy/clear`, c.mobileClearProxy);
  router.post(`${rt}/mobile/proxy/setup-complete`, c.mobileSetupCompleteProxy);
  router.post(`${rt}/mobile/proxy/install-ca`, c.mobileInstallCaCert);

  // Mobile — app management
  router.post(`${rt}/mobile/apps/install`, c.mobileInstallApk);
  router.post(`${rt}/mobile/apps/uninstall`, c.mobileUninstallApp);
  router.post(`${rt}/mobile/apps/launch`, c.mobileLaunchApp);
  router.post(`${rt}/mobile/apps/stop`, c.mobileStopApp);
  router.post(`${rt}/mobile/apps/check`, c.mobileCheckAppInstalled);
  router.post(`${rt}/mobile/apps/list`, c.mobileListPackages);

  // Mobile — profiles
  router.get(`${rt}/mobile/profiles`, c.mobileGetProfiles);
  router.get(`${rt}/mobile/profiles/:profileId`, c.mobileGetProfile);
  router.post(`${rt}/mobile/profiles`, c.mobileCreateProfile);
  router.put(`${rt}/mobile/profiles/:profileId`, c.mobileUpdateProfile);
  router.delete(`${rt}/mobile/profiles/:profileId`, c.mobileDeleteProfile);

  // Mobile — logcat
  router.post(`${rt}/mobile/logcat/start`, c.mobileStartLogcat);
  router.post(`${rt}/mobile/logcat/stop`, c.mobileStopLogcat);

  return router;
}