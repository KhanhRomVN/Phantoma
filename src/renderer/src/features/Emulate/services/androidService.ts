export interface Device {
  name: string;
  serial: string;
  type: 'physical' | 'running-vm';
}

export interface WirelessConnectResult {
  success: boolean;
  ip?: string;
  message?: string;
  error?: string;
}

export const androidService = {
  async listDevices() {
    return window.api.invoke('mobile:detect-emulators');
  },

  async listGenymotionVms() {
    return window.api.invoke('mobile:list-genymotion-vms');
  },

  async enableWirelessAdb(serial: string): Promise<WirelessConnectResult> {
    return window.api.invoke('mobile:enable-wireless-adb', serial);
  },

  async connectWireless(ip: string, port: string = '5555'): Promise<WirelessConnectResult> {
    return window.api.invoke('mobile:connect-wireless', ip, port);
  },

  async listPackages(serial: string) {
    return window.api.invoke('mobile:list-packages', serial);
  },
};

export default androidService;