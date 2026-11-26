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
 * Event stream: xem hook useNetworkEvents / runtime-ws-bridge.
 * ------------------------------------------------------------------
 */

import ApiService from '@renderer/services/api.service';
import { resolveEmulateBaseUrl } from './emulate-base-url';

// Client cho Emulate Service
let _emulateClientInstance: ApiService | null = null;

function getEmulateClient(): ApiService {
  if (!_emulateClientInstance) {
    const storedUrl = localStorage.getItem('emulate_service_url');
    const baseUrl = storedUrl ? `http://${storedUrl}` : resolveEmulateBaseUrl();
    _emulateClientInstance = new ApiService(baseUrl);

    window.addEventListener('emulateUrlChanged', () => {
      const newStoredUrl = localStorage.getItem('emulate_service_url');
      const newBaseUrl = newStoredUrl ? `http://${newStoredUrl}` : resolveEmulateBaseUrl();
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

  async unregisterTarget(_targetId: string) {
    return this.invoke<{ success: boolean }>(async () => ({ success: true }));
  }

  async listRunningTargets() {
    return this.invoke<{ targets: unknown[] }>(async () => {
      const res = await getEmulateClient().get<{ targets: unknown[] }>(`${BASE}/health`);
      return { targets: res?.targets ?? [] };
    });
  }

  // ── CLI capture ─────────────────────────────────────────────────
  async startCliEbpf(
    targetId: string,
    executablePath?: string,
    useSandbox?: boolean,
    sudoPassword?: string,
  ) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/ebpf`, {
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
      getEmulateClient().post('/sessions', { id: sessionId }),
    );
  }

  async destroyProxySession(sessionId: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().del(`/sessions/${encodeURIComponent(sessionId)}`),
    );
  }

  async stopAllProxy() {
    return this.invoke<{ success: boolean }>(() => getEmulateClient().post('/sessions/stop-all', {}));
  }

  async setIntercept(enabled: boolean, appId = 'default') {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`/sessions/${encodeURIComponent(appId)}/intercept`, { enabled }),
    );
  }

  async setBreakpointRules(rules: unknown[]) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post('/breakpoints/rules', { rules }),
    );
  }

  async resolveBreakpoint(requestId: string, edited: unknown) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post('/breakpoints/resolve', { requestId, edited }),
    );
  }

  async forwardRequest(id: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`/requests/${encodeURIComponent(id)}/forward`, {}),
    );
  }

  async dropRequest(id: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`/requests/${encodeURIComponent(id)}/drop`, {}),
    );
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

  // ── Mobile ──────────────────────────────────────────────────────
  async mobileDetectEmulators() {
    return this.invoke(() => getEmulateClient().get(`${BASE}/mobile/devices`));
  }

  async mobileListGenymotionVms() {
    return this.invoke<string[]>(async () => []);
  }


  async mobileInjectSslBypass(serial: string, packageName: string) {
    return this.invoke<boolean>(() =>
      getEmulateClient().post(`${BASE}/mobile/ssl-bypass/start`, { serial, packageName }),
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
