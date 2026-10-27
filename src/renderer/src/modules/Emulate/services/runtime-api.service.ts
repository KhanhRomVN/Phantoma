/**
 * ------------------------------------------------------------------
 * Runtime API Service
 * ------------------------------------------------------------------
 * Thay thế ipcService (window.api.invoke) cho module Emulate. Gọi REST
 * endpoints của express-server tại /api/v1/runtime/*. Mỗi method tương
 * ứng 1-1 với IPC channel cũ để dễ đối chiếu.
 *
 * Lưu ý: Một số endpoint (như launch) giờ đây thuộc về Emulate Service
 * (port 3002) thay vì Main Server (port 8080). Chúng ta duy trì hai
 * client instances:
 * - _mainClient: Cho các legacy endpoints (nếu còn) trên port 8080.
 * - _emulateClient: Cho các runtime endpoints mới trên port 3002.
 *
 * SSE event stream: xem hook useRuntimeEvents / runtime-sse-bridge.
 * ------------------------------------------------------------------
 */

import ApiService from '@renderer/services/api.service';

// Client cho Emulate Service (Port 3002)
let _emulateClientInstance: ApiService | null = null;

function getEmulateClient(): ApiService {
  if (!_emulateClientInstance) {
    const storedUrl = localStorage.getItem('emulate_service_url');
    const baseUrl = storedUrl ? `http://${storedUrl}` : 'http://localhost:3002';
    _emulateClientInstance = new ApiService(baseUrl);
    
    // Listen for URL changes to recreate client
    window.addEventListener('emulateUrlChanged', () => {
      const newStoredUrl = localStorage.getItem('emulate_service_url');
      const newBaseUrl = newStoredUrl ? `http://${newStoredUrl}` : 'http://localhost:3002';
      _emulateClientInstance!.setBaseUrl(newBaseUrl);
    });
  }
  return _emulateClientInstance;
}

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
      console.warn('[RuntimeApi] request failed', {
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
    userDataDir?: string,
  ) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/launch`, {
        appName,
        proxyUrl,
        customUrl,
        mode,
        useEnvInject,
        targetId,
        useSandbox,
        userDataDir,
      }),
    );
  }

  async terminateApp(targetId?: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/terminate`, { targetId }),
    );
  }

  async healthCheck() {
    return this.invoke<{
      healthy: boolean;
      timestamp: number;
      targets: Array<{ targetId: string; pid: number; port: number; alive: boolean }>;
    }>(() => getEmulateClient().get(`${BASE}/health`));
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
      getEmulateClient().post(`${BASE}/targets/register`, data),
    );
  }

  async unregisterTarget(targetId: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().del(`${BASE}/targets/${encodeURIComponent(targetId)}`),
    );
  }

  async listRunningTargets() {
    return this.invoke<{ targets: unknown[] }>(() => getEmulateClient().get(`${BASE}/targets/running`));
  }

  // ── CLI capture ─────────────────────────────────────────────────
  async startCliEbpf(
    targetId: string,
    executablePath?: string,
    useSandbox?: boolean,
    sudoPassword?: string,
  ) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/cli/ebpf`, {
        targetId,
        executablePath,
        useSandbox,
        sudoPassword,
      }),
    );
  }

  async startCliPcap(
    targetId: string,
    executablePath?: string,
    useSandbox?: boolean,
    sudoPassword?: string,
  ) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/cli/pcap`, {
        targetId,
        executablePath,
        useSandbox,
        sudoPassword,
      }),
    );
  }

  async startCliDebug(targetId: string, executablePath?: string, useSandbox?: boolean) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/cli/debug`, { targetId, executablePath, useSandbox }),
    );
  }

  async startCliCdp(targetId: string, executablePath?: string, useSandbox?: boolean) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/cli/cdp`, { targetId, executablePath, useSandbox }),
    );
  }

  async stopCliCapture(targetId: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/cli/${encodeURIComponent(targetId)}/stop`, {}),
    );
  }

  // ── Proxy ──────────────────────────────────────────────────────
  async createProxySession(sessionId: string) {
    return this.invoke<{ port: number }>(() =>
      getEmulateClient().post(`${BASE}/proxy/sessions`, { sessionId }),
    );
  }

  async destroyProxySession(sessionId: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().request(`${BASE}/proxy/sessions`, {
        method: 'DELETE',
        body: JSON.stringify({ sessionId }),
      }),
    );
  }

  async stopAllProxy() {
    return this.invoke<{ success: boolean }>(() => getEmulateClient().post(`${BASE}/proxy/stop-all`, {}));
  }

  async setIntercept(enabled: boolean, appId?: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/proxy/intercept`, { enabled, appId }),
    );
  }

  async setBreakpointRules(rules: unknown[]) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/proxy/breakpoint-rules`, { rules }),
    );
  }

  async resolveBreakpoint(requestId: string, edited: unknown) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/proxy/resolve-breakpoint`, { requestId, edited }),
    );
  }

  async forwardRequest(id: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/proxy/forward`, { id }),
    );
  }

  async dropRequest(id: string) {
    return this.invoke<{ success: boolean }>(() => getEmulateClient().post(`${BASE}/proxy/drop`, { id }));
  }
  // ── CDP ─────────────────────────────────────────────────────────
  async connectCdp(port: number, expectedUrl?: string, targetId?: string) {
    return this.invoke<{ success: boolean; port: number }>(() =>
      getEmulateClient().post(`${BASE}/cdp/connect`, { port, expectedUrl, targetId }),
    );
  }

  async disconnectCdp(targetId?: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/cdp/disconnect`, { targetId }),
    );
  }

  async getCdpState(targetId?: string) {
    const qs = targetId ? `?targetId=${encodeURIComponent(targetId)}` : '';
    return this.invoke<{ connected: boolean; targets: string[] }>(() =>
      getEmulateClient().get(`${BASE}/cdp/state${qs}`),
    );
  }

  async reloadCdp(targetId?: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/cdp/reload`, { targetId }),
    );
  }

  async injectCdpBorder(targetId?: string, color?: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/cdp/inject-border`, { targetId, color }),
    );
  }

  async navigateCdp(url: string, targetId?: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/cdp/navigate`, { url, targetId }),
    );
  }

  // ── Inspector ──────────────────────────────────────────────────
  async inspectorSend(payload: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }) {
    return this.invoke(() => getEmulateClient().post(`${BASE}/inspector/send-request`, payload));
  }

  // ── Command execution ───────────────────────────────────────────
  async exec(command: string, cwd?: string) {
    return this.invoke<{ success: boolean; stdout?: string; stderr?: string; error?: string }>(() =>
      getEmulateClient().post(`${BASE}/exec`, { command, cwd }),
    );
  }

  // ── Terminal ────────────────────────────────────────────────────
  async terminalSpawn(terminalId: string, cwd?: string) {
    return this.invoke<{ pid: number; shell: string }>(() =>
      getEmulateClient().post(`${BASE}/terminal/spawn`, { terminalId, cwd }),
    );
  }

  async terminalWrite(terminalId: string, data: string) {
    return getEmulateClient().post(`${BASE}/terminal/write`, { terminalId, data }).catch(() => {});
  }

  async terminalResize(terminalId: string, cols: number, rows: number) {
    return getEmulateClient().post(`${BASE}/terminal/resize`, { terminalId, cols, rows }).catch(() => {});
  }

  async terminalKill(terminalId: string) {
    return getEmulateClient().del(`${BASE}/terminal/${encodeURIComponent(terminalId)}`).catch(() => {});
  }

  // ── Mobile ──────────────────────────────────────────────────────
  async mobileCheckTools() {
    return this.invoke(() => getEmulateClient().get(`${BASE}/mobile/tools`));
  }

  async mobileCheckAdb() {
    return this.invoke(() => getEmulateClient().get(`${BASE}/mobile/adb`));
  }

  async mobileConnectWireless(ip: string, port: string) {
    return this.invoke(() => getEmulateClient().post(`${BASE}/mobile/wireless/connect`, { ip, port }));
  }

  async mobileEnableWirelessAdb(serial: string) {
    return this.invoke(() => getEmulateClient().post(`${BASE}/mobile/wireless/enable`, { serial }));
  }

  async mobileDetectEmulators() {
    return this.invoke(() => getEmulateClient().get(`${BASE}/mobile/emulators`));
  }

  async mobileListGenymotionVms() {
    return this.invoke(() => getEmulateClient().get(`${BASE}/mobile/genymotion/vms`));
  }

  async mobileCheckFrida(serial: string) {
    return this.invoke<string>(() => getEmulateClient().post(`${BASE}/mobile/frida/check`, { serial }));
  }

  async mobileInstallFrida(serial: string) {
    return this.invoke<boolean>(() => getEmulateClient().post(`${BASE}/mobile/frida/install`, { serial }));
  }

  async mobileStartFrida(serial: string) {
    return this.invoke<boolean>(() => getEmulateClient().post(`${BASE}/mobile/frida/start`, { serial }));
  }

  async mobileInjectSslBypass(serial: string, packageName: string) {
    return this.invoke<boolean>(() =>
      getEmulateClient().post(`${BASE}/mobile/frida/inject-ssl-bypass`, { serial, packageName }),
    );
  }

  async mobileListPackages(serial: string) {
    return this.invoke(() => getEmulateClient().post(`${BASE}/mobile/apps/list`, { serial }));
  }

  async mobileStartLogcat(serial: string) {
    return this.invoke<boolean>(() => getEmulateClient().post(`${BASE}/mobile/logcat/start`, { serial }));
  }

  async mobileStopLogcat() {
    return this.invoke<boolean>(() => getEmulateClient().post(`${BASE}/mobile/logcat/stop`, {}));
  }
}

export const runtimeApi = new RuntimeApiService();
export default runtimeApi;
