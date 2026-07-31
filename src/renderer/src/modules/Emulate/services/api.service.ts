// API Service - Wrapper for IPC calls
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private async invoke<T>(channel: string, ...args: any[]): Promise<ApiResponse<T>> {
    try {
      const result = await window.api.invoke(channel, ...args);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Apps
  async getApps() {
    return this.invoke('apps:get-all');
  }

  async addApp(appData: any) {
    return this.invoke('apps:add', appData);
  }

  async updateApp(id: string, data: any) {
    return this.invoke('apps:update', id, data);
  }

  async deleteApp(id: string) {
    return this.invoke('apps:delete', id);
  }

  async scanPcApps() {
    return this.invoke('apps:scan-pc');
  }

  // Proxy
  async createProxySession(sessionId: string) {
    return this.invoke('proxy:create-session', sessionId);
  }

  async destroyProxySession(sessionId: string) {
    return this.invoke('proxy:destroy-session', sessionId);
  }

  async getProxyState() {
    return this.invoke('proxy:get-state');
  }

  // CDP
  async connectCdp(port: number) {
    return this.invoke('cdp:connect', port);
  }

  async disconnectCdp() {
    return this.invoke('cdp:disconnect');
  }

  async getCdpState() {
    return this.invoke('cdp:get-state');
  }

  async reloadCdp() {
    return this.invoke('cdp:reload');
  }

  async injectCdpBorder() {
    return this.invoke('cdp:inject-border');
  }

  // App Launch
  async launchApp(appId: string, proxyUrl: string, customUrl?: string, mode?: string) {
    return this.invoke('app:launch', appId, proxyUrl, customUrl, mode);
  }

  async terminateApp() {
    return this.invoke('app:terminate');
  }

  // Target management
  async getActiveTargets() {
    return this.invoke('emulate:get-active-targets');
  }

  async setActiveTargets(targets: any[], activeId: string | null) {
    return this.invoke('emulate:set-active-targets', targets, activeId);
  }

  // Inspector / Request
  async sendRequest(config: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }) {
    return this.invoke('inspector:send-request', config);
  }

  // Mobile / Android
  async startLogcat(serial: string) {
    return this.invoke('mobile:start-logcat', serial);
  }

  async stopLogcat(serial: string) {
    return this.invoke('mobile:stop-logcat', serial);
  }

  async listPackages(serial: string) {
    return this.invoke('mobile:list-packages', serial);
  }

  async detectEmulators() {
    return this.invoke('mobile:detect-emulators');
  }

  async listGenymotionVms() {
    return this.invoke('mobile:list-genymotion-vms');
  }

  async enableWirelessAdb(serial: string) {
    return this.invoke('mobile:enable-wireless-adb', serial);
  }

  async connectWireless(ip: string, port: string) {
    return this.invoke('mobile:connect-wireless', ip, port);
  }

  // Media / Cache
  async getCacheManifest() {
    return this.invoke('media:get-cache-manifest');
  }
}

export const apiService = new ApiService();
export default apiService;