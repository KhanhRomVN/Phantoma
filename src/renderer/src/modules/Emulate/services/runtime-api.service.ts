/**
 * ------------------------------------------------------------------
 * Runtime API Service
 * ------------------------------------------------------------------
 * Thay thế ipcService (window.api.invoke) cho module Emulate. Gọi REST
 * endpoints của express-server tại /api/v1/runtime/*. Mỗi method tương
 * ứng 1-1 với IPC channel cũ để dễ đối chiếu.
 *
 * SSE event stream: xem hook useRuntimeEvents / runtime-sse-bridge.
 * ------------------------------------------------------------------
 */

import { apiService } from '@renderer/services/api.service';
import { logger } from '@renderer/utils/logger';

const BASE = '/api/v1/runtime';

export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

class RuntimeApiService {
  private async invoke<T>(fn: () => Promise<T>): Promise<ApiResult<T>> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      logger.warn('[RuntimeApi] request failed', {
        err: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ── App launch / terminate ──────────────────────────────────────
  async launchApp(
    appName: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: string,
    useEnvInject?: boolean,
    targetId?: string,
    useSandbox?: boolean,
  ) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/launch`, {
        appName,
        proxyUrl,
        customUrl,
        mode,
        useEnvInject,
        targetId,
        useSandbox,
      }),
    );
  }

  async terminateApp() {
    return this.invoke<{ success: boolean }>(() => apiService.post(`${BASE}/terminate`, {}));
  }

  // ── Target metadata ─────────────────────────────────────────────
  async registerTarget(data: {
    targetId: string;
    title: string;
    favicon?: string;
    platform?: string;
    url?: string;
  }) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/targets/register`, data),
    );
  }

  async unregisterTarget(targetId: string) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.del(`${BASE}/targets/${encodeURIComponent(targetId)}`),
    );
  }

  async listRunningTargets() {
    return this.invoke<{ targets: unknown[] }>(() => apiService.get(`${BASE}/targets/running`));
  }

  // ── CLI capture ─────────────────────────────────────────────────
  async startCliEbpf(targetId: string, executablePath?: string, useSandbox?: boolean) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/cli/ebpf`, { targetId, executablePath, useSandbox }),
    );
  }

  async startCliPcap(targetId: string, executablePath?: string, useSandbox?: boolean) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/cli/pcap`, { targetId, executablePath, useSandbox }),
    );
  }

  async startCliDebug(targetId: string, executablePath?: string, useSandbox?: boolean) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/cli/debug`, { targetId, executablePath, useSandbox }),
    );
  }

  async startCliCdp(targetId: string, executablePath?: string, useSandbox?: boolean) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/cli/cdp`, { targetId, executablePath, useSandbox }),
    );
  }

  async stopCliCapture(targetId: string) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/cli/${encodeURIComponent(targetId)}/stop`, {}),
    );
  }

  // ── Proxy ───────────────────────────────────────────────────────
  async createProxySession(sessionId: string) {
    return this.invoke<{ port: number }>(() =>
      apiService.post(`${BASE}/proxy/sessions`, { sessionId }),
    );
  }

  async destroyProxySession(sessionId: string) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.request(`${BASE}/proxy/sessions`, {
        method: 'DELETE',
        body: JSON.stringify({ sessionId }),
      }),
    );
  }

  async stopAllProxy() {
    return this.invoke<{ success: boolean }>(() => apiService.post(`${BASE}/proxy/stop-all`, {}));
  }

  async setIntercept(enabled: boolean, appId?: string) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/proxy/intercept`, { enabled, appId }),
    );
  }

  async setBreakpointRules(rules: unknown[]) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/proxy/breakpoint-rules`, { rules }),
    );
  }

  async resolveBreakpoint(requestId: string, edited: unknown) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/proxy/resolve-breakpoint`, { requestId, edited }),
    );
  }

  async forwardRequest(id: string) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/proxy/forward`, { id }),
    );
  }

  async dropRequest(id: string) {
    return this.invoke<{ success: boolean }>(() => apiService.post(`${BASE}/proxy/drop`, { id }));
  }

  // ── CDP ─────────────────────────────────────────────────────────
  async connectCdp(port: number) {
    return this.invoke<{ success: boolean; port: number }>(() =>
      apiService.post(`${BASE}/cdp/connect`, { port }),
    );
  }

  async disconnectCdp() {
    return this.invoke<{ success: boolean }>(() => apiService.post(`${BASE}/cdp/disconnect`, {}));
  }

  async getCdpState() {
    return this.invoke<{ connected: boolean }>(() => apiService.get(`${BASE}/cdp/state`));
  }

  async reloadCdp() {
    return this.invoke<{ success: boolean }>(() => apiService.post(`${BASE}/cdp/reload`, {}));
  }

  async injectCdpBorder() {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/cdp/inject-border`, {}),
    );
  }

  async navigateCdp(url: string) {
    return this.invoke<{ success: boolean }>(() =>
      apiService.post(`${BASE}/cdp/navigate`, { url }),
    );
  }

  // ── Inspector ───────────────────────────────────────────────────
  async inspectorSend(payload: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }) {
    return this.invoke(() => apiService.post(`${BASE}/inspector/send-request`, payload));
  }

  // ── Command execution ───────────────────────────────────────────
  async exec(command: string, cwd?: string) {
    return this.invoke<{ success: boolean; stdout?: string; stderr?: string; error?: string }>(() =>
      apiService.post(`${BASE}/exec`, { command, cwd }),
    );
  }

  // ── Terminal ────────────────────────────────────────────────────
  async terminalSpawn(terminalId: string, cwd?: string) {
    return this.invoke<{ pid: number; shell: string }>(() =>
      apiService.post(`${BASE}/terminal/spawn`, { terminalId, cwd }),
    );
  }

  async terminalWrite(terminalId: string, data: string) {
    return apiService.post(`${BASE}/terminal/write`, { terminalId, data }).catch(() => {});
  }

  async terminalResize(terminalId: string, cols: number, rows: number) {
    return apiService.post(`${BASE}/terminal/resize`, { terminalId, cols, rows }).catch(() => {});
  }

  async terminalKill(terminalId: string) {
    return apiService.del(`${BASE}/terminal/${encodeURIComponent(terminalId)}`).catch(() => {});
  }

  // ── Mobile ──────────────────────────────────────────────────────
  async mobileCheckTools() {
    return this.invoke(() => apiService.get(`${BASE}/mobile/tools`));
  }

  async mobileCheckAdb() {
    return this.invoke(() => apiService.get(`${BASE}/mobile/adb`));
  }

  async mobileConnectWireless(ip: string, port: string) {
    return this.invoke(() => apiService.post(`${BASE}/mobile/wireless/connect`, { ip, port }));
  }

  async mobileEnableWirelessAdb(serial: string) {
    return this.invoke(() => apiService.post(`${BASE}/mobile/wireless/enable`, { serial }));
  }

  async mobileDetectEmulators() {
    return this.invoke(() => apiService.get(`${BASE}/mobile/emulators`));
  }

  async mobileListGenymotionVms() {
    return this.invoke(() => apiService.get(`${BASE}/mobile/genymotion/vms`));
  }

  async mobileCheckFrida(serial: string) {
    return this.invoke<string>(() => apiService.post(`${BASE}/mobile/frida/check`, { serial }));
  }

  async mobileInstallFrida(serial: string) {
    return this.invoke<boolean>(() => apiService.post(`${BASE}/mobile/frida/install`, { serial }));
  }

  async mobileStartFrida(serial: string) {
    return this.invoke<boolean>(() => apiService.post(`${BASE}/mobile/frida/start`, { serial }));
  }

  async mobileInjectSslBypass(serial: string, packageName: string) {
    return this.invoke<boolean>(() =>
      apiService.post(`${BASE}/mobile/frida/inject-ssl-bypass`, { serial, packageName }),
    );
  }

  async mobileListPackages(serial: string) {
    return this.invoke(() => apiService.post(`${BASE}/mobile/apps/list`, { serial }));
  }

  async mobileStartLogcat(serial: string) {
    return this.invoke<boolean>(() => apiService.post(`${BASE}/mobile/logcat/start`, { serial }));
  }

  async mobileStopLogcat() {
    return this.invoke<boolean>(() => apiService.post(`${BASE}/mobile/logcat/stop`, {}));
  }
}

export const runtimeApi = new RuntimeApiService();
export default runtimeApi;