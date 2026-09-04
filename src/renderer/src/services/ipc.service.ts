/**
 * ------------------------------------------------------------------
 * IPC Service
 * ------------------------------------------------------------------
 * Wrapper cho toàn bộ Electron IPC calls (window.api.invoke).
 * Dùng chung trong toàn bộ renderer, không bó hẹp trong một module.
 *
 * Các hàm chính (theo nhóm):
 * [Apps]        : getApps(), addApp(), updateApp(), deleteApp(), scanPcApps()
 * [Proxy]       : createProxySession(), destroyProxySession(), getProxyState()
 * [CDP]         : getCdpLaunchPort(), connectCdp(), disconnectCdp(), getCdpState(), reloadCdp(), injectCdpBorder()
 * [App Launch]  : launchApp(), terminateApp()
 * [Target]      : getActiveTargets(), setActiveTargets()
 * [Inspector]   : sendRequest()
 * [Mobile]      : startLogcat(), stopLogcat(), listPackages(), detectEmulators(), listGenymotionVms()
 *                 enableWirelessAdb(), connectWireless(), checkFrida(), installFrida(), startFrida(), injectSSLBypass()
 * [Media]       : getCacheManifest()
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Class ──────────────────────────────────────────────────────────────
class IpcService {
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

  // ── Apps ──
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

  // ── Proxy ──
  async createProxySession(sessionId: string) {
    return this.invoke('proxy:create-session', sessionId);
  }
  async destroyProxySession(sessionId: string) {
    return this.invoke('proxy:destroy-session', sessionId);
  }
  async getProxyState() {
    return this.invoke('proxy:get-state');
  }

  // ── CDP ──
  async getCdpLaunchPort() {
    return this.invoke<{ port: number }>('cdp:get-launch-port');
  }
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

  // ── App Launch ──
  async launchApp(
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: string,
    useEnvInject?: boolean,
    targetId?: string,
  ) {
    return this.invoke('app:launch', appId, proxyUrl, customUrl, mode, useEnvInject, targetId);
  }
  async terminateApp() {
    return this.invoke('app:terminate');
  }

  // ── Target Management ──
  async getActiveTargets() {
    return this.invoke('emulate:get-active-targets');
  }
  async setActiveTargets(targets: any[], activeId: string | null) {
    return this.invoke('emulate:set-active-targets', targets, activeId);
  }
  async registerTarget(targetData: {
    targetId: string;
    title: string;
    favicon?: string;
    platform?: string;
    url?: string;
  }) {
    return this.invoke('target:register', targetData);
  }
  async unregisterTarget(targetId: string) {
    return this.invoke('target:unregister', targetId);
  }
  async listRunningTargets() {
    return this.invoke('target:list-running');
  }

  // ── Inspector / Request ──
  async sendRequest(config: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }) {
    return this.invoke('inspector:send-request', config);
  }

  // ── Mobile / Android ──
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
  async checkFrida(serial: string) {
    return this.invoke<string>('mobile:check-frida', serial);
  }
  async installFrida(serial: string) {
    return this.invoke<boolean>('mobile:install-frida', serial);
  }
  async startFrida(serial: string) {
    return this.invoke<boolean>('mobile:start-frida', serial);
  }
  async injectSSLBypass(serial: string, packageName: string) {
    return this.invoke<boolean>('mobile:inject-ssl-bypass', serial, packageName);
  }

  // ── Media / Cache ──
  async getCacheManifest() {
    return this.invoke('media:get-cache-manifest');
  }
}

// ─── Singleton ────────────────────────────────────────────────────���─────
export const ipcService = new IpcService();
export default ipcService;