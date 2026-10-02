/**
 * ------------------------------------------------------------------
 * Mobile Runtime (port từ src/main/ipc/mobile.handlers.ts)
 * ------------------------------------------------------------------
 * Tập trung các thao tác mobile cho Emulate: adb, logcat streaming,
 * emulator detection, frida-device, proxy config, profile management.
 *
 * Thay windowManager.getMainWindow().webContents.send → runtimeBus.
 * ------------------------------------------------------------------
 */

import { spawn, type ChildProcess } from 'child_process';
import { runtimeBus } from '../event-bus';
import {
  checkADBAvailability,
  detectAllEmulators,
  getEmulatorDetails,
  isAppInstalled,
  getInstalledPackages,
  resolveEmulatorSerial,
} from './mobile-detector';
import {
  installFridaServer,
  startFridaServer,
  stopFridaServer,
  isFridaRunning,
  injectSSLBypass,
  injectCustomScript,
  listRunningProcesses,
  isFridaServerInstalled,
} from '../frida';
import {
  configureEmulatorProxy,
  clearEmulatorProxy,
  setupCompleteProxy,
  installAPK,
  uninstallApp,
  launchApp,
  stopApp,
  setupProxyCertificate,
  getProxyCACertPath,
} from './mobile-proxy-config';
import {
  getAllProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile,
  type GenymotionProfile,
} from './genymotion-profiles';
import {
  isGenymotionInstalled,
  isWaydroidInstalled,
  listGenymotionVMs,
  stopGenymotionVM,
  stopWaydroid,
  launchGenymotionWithProfile,
  launchWaydroidWithConfig,
  getInstallInstructions,
} from './emulator-launcher';
import { createLogger } from '../../utils/logger';

const logger = createLogger('MobileRuntime');

let activeLogcatProcess: ChildProcess | null = null;
let lastLogcatRequestTime = 0;

export const mobileRuntime = {
  async checkTools() {
    const [genymotion, waydroid, adb] = await Promise.all([
      isGenymotionInstalled(),
      isWaydroidInstalled(),
      checkADBAvailability(),
    ]);
    return {
      genymotion,
      waydroid,
      adb: adb.available,
      adbVersion: adb.version,
      installInstructions: getInstallInstructions(),
    };
  },

  checkAdb: () => checkADBAvailability(),

  async connectWireless(ip: string, port: string) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    try {
      const { stdout } = await execAsync(`adb connect ${ip}:${port}`);
      return { success: true, message: stdout.trim() };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async enableWirelessAdb(serial: string) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    try {
      await new Promise((r) => setTimeout(r, 3000));
      let ip = '';
      for (let i = 0; i < 3; i++) {
        try {
          const { stdout } = await execAsync(
            `adb -s "${serial}" shell ip -f inet addr show wlan0 | grep -o 'inet [0-9.]*' | cut -d' ' -f2`,
            { timeout: 5000 },
          );
          ip = stdout.trim();
          if (ip) break;
        } catch {
          logger.warn('Failed to get IP via ip -f inet addr');
        }
        if (!ip && i < 2) await new Promise((r) => setTimeout(r, 2000));
      }
      if (ip) {
        return { success: true, ip, port: '5555', message: `Wireless ADB at ${ip}:5555` };
      }
      return { success: true, message: 'Wireless ADB enabled but IP not retrieved' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to enable wireless ADB' };
    }
  },

  detectEmulators: () => detectAllEmulators(),
  getEmulatorDetails: (serial: string) => getEmulatorDetails(serial),
  listGenymotionVMs: () => listGenymotionVMs(),

  async launchGenymotion(profileId: string, proxyHost?: string, proxyPort?: number) {
    const profile = getProfileById(profileId);
    if (!profile) return { success: false, error: 'Profile not found' };
    return launchGenymotionWithProfile(profile, { proxyHost, proxyPort }, (status) => {
      runtimeBus.emitEvent('mobile:launch-progress', status);
    });
  },

  async launchWaydroid(proxyHost?: string, proxyPort?: number) {
    return launchWaydroidWithConfig({ proxyHost, proxyPort }, (status) => {
      runtimeBus.emitEvent('mobile:launch-progress', status);
    });
  },

  async checkFrida(serial: string) {
    const resolved = await resolveEmulatorSerial(serial);
    if (!resolved) return 'not_installed';
    if (await isFridaRunning(resolved)) return 'running';
    if (await isFridaServerInstalled(resolved)) return 'installed';
    return 'not_installed';
  },

  async installFrida(serial: string) {
    const resolved = await resolveEmulatorSerial(serial);
    if (!resolved) return false;
    const details = await getEmulatorDetails(resolved);
    let arch = 'x86';
    if (details) {
      if (details.architecture.includes('arm64')) arch = 'arm64';
      else if (details.architecture.includes('arm')) arch = 'arm';
      else if (details.architecture.includes('x86_64')) arch = 'x86_64';
      else if (details.architecture.includes('x86')) arch = 'x86';
    }
    return installFridaServer(resolved, arch, (status) => {
      runtimeBus.emitEvent('mobile:frida-progress', status);
    });
  },

  async startFrida(serial: string) {
    const resolved = await resolveEmulatorSerial(serial);
    if (!resolved) return false;
    return startFridaServer(resolved);
  },

  async stopFrida(serial: string) {
    const resolved = await resolveEmulatorSerial(serial);
    if (!resolved) return false;
    return stopFridaServer(resolved);
  },

  async injectSslBypass(serial: string, packageName: string) {
    const resolved = await resolveEmulatorSerial(serial);
    if (!resolved) return false;
    return injectSSLBypass(resolved, packageName, (msg) => {
      runtimeBus.emitEvent('mobile:frida-log', msg);
    });
  },

  async injectCustomScript(serial: string, packageName: string, script: string) {
    const resolved = await resolveEmulatorSerial(serial);
    if (!resolved) return false;
    return injectCustomScript(resolved, packageName, script, (log) => {
      runtimeBus.emitEvent('mobile:frida-log', log);
    });
  },

  async listProcesses(serial: string) {
    const resolved = await resolveEmulatorSerial(serial);
    if (!resolved) return [];
    return listRunningProcesses(resolved);
  },

  async stopEmulator(vmName: string, type: 'genymotion' | 'waydroid') {
    return type === 'genymotion' ? stopGenymotionVM(vmName) : stopWaydroid();
  },

  async configureProxy(serial: string, host: string, port: number, fallbackName?: string) {
    const resolved = await resolveEmulatorSerial(serial, fallbackName);
    return configureEmulatorProxy(resolved || serial, host, port);
  },

  async clearProxy(serial: string, fallbackName?: string) {
    const resolved = await resolveEmulatorSerial(serial, fallbackName);
    return clearEmulatorProxy(resolved || serial);
  },

  async setupCompleteProxy(serial: string, host: string, port: number, fallbackName?: string) {
    const resolved = await resolveEmulatorSerial(serial, fallbackName);
    return setupCompleteProxy(resolved || serial, host, port, (status) => {
      runtimeBus.emitEvent('mobile:proxy-progress', status);
    });
  },

  async installCaCert(serial: string) {
    const resolved = await resolveEmulatorSerial(serial);
    if (!resolved) return false;
    try {
      const caPath = getProxyCACertPath();
      return await setupProxyCertificate(resolved, caPath, (status) => {
        runtimeBus.emitEvent('mobile:install-cert-progress', status);
      });
    } catch (e) {
      logger.error('Failed to install CA cert', { err: String(e) });
      return false;
    }
  },

  async installApk(serial: string, apkPath: string) {
    const resolved = await resolveEmulatorSerial(serial);
    return installAPK(resolved || serial, apkPath, (status) => {
      runtimeBus.emitEvent('mobile:install-progress', status);
    });
  },

  async uninstallApp(serial: string, packageName: string) {
    const resolved = await resolveEmulatorSerial(serial);
    return uninstallApp(resolved || serial, packageName);
  },

  async launchApp(serial: string, packageName: string) {
    const resolved = await resolveEmulatorSerial(serial);
    return launchApp(resolved || serial, packageName);
  },

  stopApp: (serial: string, packageName: string) => stopApp(serial, packageName),
  isAppInstalled: (serial: string, packageName: string) => isAppInstalled(serial, packageName),
  listPackages: (serial: string) => getInstalledPackages(serial),

  getProfiles: () => getAllProfiles(),
  getProfile: (id: string) => getProfileById(id),
  createProfile: (data: Omit<GenymotionProfile, 'id' | 'createdAt' | 'updatedAt'>) =>
    createProfile(data),
  updateProfile: (id: string, updates: Partial<GenymotionProfile>) =>
    updateProfile(id, updates),
  deleteProfile: (id: string) => deleteProfile(id),

  async startLogcat(serial: string): Promise<boolean> {
    const requestTime = Date.now();
    lastLogcatRequestTime = requestTime;

    try {
      const resolved = await resolveEmulatorSerial(serial);
      if (lastLogcatRequestTime !== requestTime) return false;
      if (!resolved) throw new Error('Emulator serial not found');

      if (activeLogcatProcess) {
        try {
          activeLogcatProcess.kill();
        } catch {
          // ignore
        }
        activeLogcatProcess = null;
      }

      activeLogcatProcess = spawn('adb', ['-s', resolved, 'logcat', '-v', 'time'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let buffer = '';
      activeLogcatProcess.stdout?.on('data', (data) => {
        buffer += data.toString();
        let lineEnd = buffer.indexOf('\n');
        while (lineEnd !== -1) {
          const line = buffer.substring(0, lineEnd).trim();
          buffer = buffer.substring(lineEnd + 1);
          if (line) runtimeBus.emitEvent('mobile:logcat-output', line);
          lineEnd = buffer.indexOf('\n');
        }
      });

      activeLogcatProcess.stderr?.on('data', (data) => {
        logger.error('Logcat error', { err: data.toString() });
      });

      activeLogcatProcess.on('exit', () => {
        activeLogcatProcess = null;
      });
      activeLogcatProcess.on('error', (err) => {
        logger.error('Logcat process error', { err: String(err) });
      });
      return true;
    } catch (e) {
      logger.error('Failed to start logcat', { err: String(e) });
      return false;
    }
  },

  stopLogcat(): boolean {
    if (activeLogcatProcess) {
      activeLogcatProcess.kill();
      activeLogcatProcess = null;
    }
    return true;
  },
};