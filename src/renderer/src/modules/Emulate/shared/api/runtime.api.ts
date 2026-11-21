/**
 * Gọi REST endpoints của Emulate Service (emulate/src/api/routes):
 * - /api/v1/runtime/*  : launch, terminate, health, CDP, eBPF, mobile
 * - /sessions, /breakpoints, /requests/:id/*  : MITM proxy (root level)
 *
 * Các method không còn route tương ứng ở server trả về
 * { success: false, error } thay vì gọi endpoint không tồn tại.
 *
 * Event stream: xem hook useNetworkEvents / runtime-ws-bridge.
 */

import ApiService from '@renderer/services/api.service';
import { resolveEmulateBaseUrl } from './emulate-base-url';
import { logger } from '../utils/logger.util';

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
const DEFAULT_PROXY_SESSION = 'default'; // ASSUMED: khớp session id 'default' mà Emulate.tsx đang dùng

export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const unsupported = (feature: string): ApiResult<any> => ({
  success: false,
  error: `${feature} is not supported by the emulate server`,
});

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

  // Server không còn route unregister; terminate đã dọn process của target
  async unregisterTarget(_targetId: string): Promise<ApiResult<{ success: boolean }>> {
    return { success: true, data: { success: true } };
  }

  async startEbpf(
    targetId: string,
    executablePath?: string,
    _useSandbox?: boolean,
    sudoPassword?: string,
    platform?: string,
  ) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/ebpf`, {
        targetId,
        executablePath,
        sudoPassword,
        platform,
      }),
    );
  }

  async startCliPcap(
    _targetId: string,
    _executablePath?: string,
    _useSandbox?: boolean,
    _sudoPassword?: string,
  ) {
    return unsupported('CLI pcap capture');
  }

  async startCliDebug(_targetId: string, _executablePath?: string, _useSandbox?: boolean) {
    return unsupported('CLI debug capture');
  }

  async startCliCdp(_targetId: string, _executablePath?: string, _useSandbox?: boolean) {
    return unsupported('CLI CDP capture');
  }

  async stopCliCapture(targetId: string) {
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`${BASE}/cli/${encodeURIComponent(targetId)}/stop`, {}),
    );
  }

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
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post('/sessions/stop-all', {}),
    );
  }

  async setIntercept(enabled: boolean, appId?: string) {
    const sessionId = appId || DEFAULT_PROXY_SESSION;
    return this.invoke<{ success: boolean }>(() =>
      getEmulateClient().post(`/sessions/${encodeURIComponent(sessionId)}/intercept`, { enabled }),
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

  async mobileConnectWireless(_ip: string, _port: string) {
    return unsupported('Wireless ADB connect');
  }

  async mobileEnableWirelessAdb(_serial: string) {
    return unsupported('Wireless ADB enable');
  }

  async mobileDetectEmulators() {
    return unsupported('Emulator detection');
  }

  async mobileListGenymotionVms() {
    return unsupported('Genymotion VM listing');
  }

  async mobileListRunningDevices() {
    return this.invoke<Array<{ name: string; serial: string; uuid: string; type: 'running-vm' }>>(() =>
      getEmulateClient().get(`${BASE}/mobile/devices`),
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

  async mobileStartSslBypass(serial: string, packageName: string) {
    return this.invoke<boolean>(() =>
      getEmulateClient().post(`${BASE}/mobile/ssl-bypass/start`, { serial, packageName }),
    );
  }

  async mobileStopSslBypass(serial: string, packageName: string) {
    return this.invoke<boolean>(() =>
      getEmulateClient().post(`${BASE}/mobile/ssl-bypass/stop`, { serial, packageName }),
    );
  }

  async mobileProvision(serial: string) {
    return this.invoke(() => getEmulateClient().post(`${BASE}/mobile/provision`, { serial }));
  }
}

export const runtimeApi = new RuntimeApiService();
export default runtimeApi;