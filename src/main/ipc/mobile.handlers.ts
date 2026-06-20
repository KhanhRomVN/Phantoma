import { ipcMain, BrowserWindow } from 'electron';
import { windowManager } from '../core/window';
import {
  checkADBAvailability,
  detectAllEmulators,
  getEmulatorDetails,
  isAppInstalled,
  getInstalledPackages,
  resolveEmulatorSerial,
} from '../utils/mobile-detector';
import {
  installFridaServer,
  startFridaServer,
  stopFridaServer,
  isFridaRunning,
  injectSSLBypass,
  injectCustomScript,
  listRunningProcesses,
  isFridaServerInstalled,
} from '../utils/frida';
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
} from '../utils/mobile-proxy-config';
import {
  getAllProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile,
  GenymotionProfile,
} from '../utils/genymotion-profiles';
import {
  isGenymotionInstalled,
  isWaydroidInstalled,
  listGenymotionVMs,
  stopGenymotionVM,
  stopWaydroid,
  launchGenymotionWithProfile,
  launchWaydroidWithConfig,
  getInstallInstructions,
} from '../utils/emulator-launcher';
import { ChildProcess, spawn } from 'child_process';

// Logcat state
let activeLogcatProcess: ChildProcess | null = null;
let lastLogcatRequestTime = 0;

export function setupMobileHandlers() {
  // Mobile System Check
  ipcMain.handle('mobile:check-adb', async () => {
    return await checkADBAvailability();
  });

  ipcMain.handle('mobile:check-tools', async () => {
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
  });

  // Wireless Connection
  ipcMain.handle('mobile:connect-wireless', async (_, ip: string, port: string) => {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync(`adb connect ${ip}:${port}`);
      return { success: true, message: stdout.trim() };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('mobile:enable-wireless-adb', async (_, serial: string) => {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      let ip = '';
      let retries = 3;

      for (let i = 0; i < retries; i++) {
        try {
          try {
            const { stdout: ipOutput } = await execAsync(
              `adb -s "${serial}" shell ip -f inet addr show wlan0 | grep -o 'inet [0-9.]*' | cut -d' ' -f2`,
              { timeout: 5000 },
            );
            ip = ipOutput.trim();
            if (ip) break;
          } catch (err) {}

          try {
            const { stdout: altIpOutput } = await execAsync(
              `adb -s "${serial}" shell "ip addr show wlan0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1"`,
              { timeout: 5000 },
            );
            ip = altIpOutput.trim();
            if (ip) break;
          } catch (err) {}

          if (!ip && i < retries - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (e) {
          console.error(`[ADB Wireless] Retry ${i + 1} error:`, e);
        }
      }

      if (ip) {
        return {
          success: true,
          ip,
          port: '5555',
          message: `Wireless ADB enabled successfully at ${ip}:5555`,
        };
      } else {
        return {
          success: true,
          message:
            'Wireless ADB enabled on port 5555, but could not retrieve IP address.\nDevice may need more time to reconnect. Check WiFi connection.',
        };
      }
    } catch (e: any) {
      console.error('[ADB Wireless] Error:', e);
      return { success: false, error: e.message || 'Failed to enable wireless ADB' };
    }
  });

  ipcMain.handle('mobile:disconnect', async (_, serial: string) => {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await execAsync(`adb disconnect ${serial}`);
      return true;
    } catch (e) {
      return false;
    }
  });

  // Emulator Detection
  ipcMain.handle('mobile:detect-emulators', async () => {
    return await detectAllEmulators();
  });

  ipcMain.handle('mobile:get-emulator-details', async (_, serial: string) => {
    return await getEmulatorDetails(serial);
  });

  // Emulator Launch
  ipcMain.handle('mobile:list-genymotion-vms', async () => {
    return await listGenymotionVMs();
  });

  ipcMain.handle(
    'mobile:launch-genymotion',
    async (_, profileId: string, proxyHost?: string, proxyPort?: number) => {
      const profile = getProfileById(profileId);
      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }

      return await launchGenymotionWithProfile(profile, { proxyHost, proxyPort }, (status) => {
        const win = windowManager.getMainWindow();
        if (win) {
          win.webContents.send('mobile:launch-progress', status);
        }
      });
    },
  );

  ipcMain.handle('mobile:launch-waydroid', async (_, proxyHost?: string, proxyPort?: number) => {
    return await launchWaydroidWithConfig({ proxyHost, proxyPort }, (status) => {
      const win = windowManager.getMainWindow();
      if (win) {
        win.webContents.send('mobile:launch-progress', status);
      }
    });
  });

  // Frida IPC
  ipcMain.handle('mobile:check-frida', async (_, serial: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) return 'not_installed';

    const running = await isFridaRunning(resolvedSerial);
    if (running) return 'running';

    const installed = await isFridaServerInstalled(resolvedSerial);
    if (installed) return 'installed';

    return 'not_installed';
  });

  ipcMain.handle('mobile:install-frida', async (_, serial: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) {
      console.error(`Could not resolve emulator serial from: ${serial}`);
      return false;
    }

    const details = await getEmulatorDetails(resolvedSerial);
    let fridaArch = 'x86';

    if (details) {
      if (details.architecture.includes('arm64')) fridaArch = 'arm64';
      else if (details.architecture.includes('arm')) fridaArch = 'arm';
      else if (details.architecture.includes('x86_64')) fridaArch = 'x86_64';
      else if (details.architecture.includes('x86')) fridaArch = 'x86';
    }

    const win = windowManager.getMainWindow();
    return await installFridaServer(resolvedSerial, fridaArch, (status) => {
      if (win) win.webContents.send('mobile:frida-progress', status);
    });
  });

  ipcMain.handle('mobile:start-frida', async (_, serial: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) return false;
    return await startFridaServer(resolvedSerial);
  });

  ipcMain.handle('mobile:inject-ssl-bypass', async (_, serial: string, packageName: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) return false;

    const win = windowManager.getMainWindow();
    return await injectSSLBypass(resolvedSerial, packageName, (msg) => {
      if (win) win.webContents.send('mobile:frida-log', msg);
    });
  });

  ipcMain.handle('mobile:stop-frida', async (_, serial: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) return false;
    return await stopFridaServer(resolvedSerial);
  });

  ipcMain.handle(
    'mobile:inject-custom-script',
    async (_, serial: string, packageName: string, script: string) => {
      const resolvedSerial = await resolveEmulatorSerial(serial);
      if (!resolvedSerial) return false;

      return await injectCustomScript(resolvedSerial, packageName, script, (log) => {
        const win = windowManager.getMainWindow();
        if (win) {
          win.webContents.send('mobile:frida-log', log);
        }
      });
    },
  );

  ipcMain.handle('mobile:list-processes', async (_, serial: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) return [];
    return await listRunningProcesses(resolvedSerial);
  });

  ipcMain.handle(
    'mobile:stop-emulator',
    async (_, vmName: string, type: 'genymotion' | 'waydroid') => {
      if (type === 'genymotion') {
        return await stopGenymotionVM(vmName);
      } else {
        return await stopWaydroid();
      }
    },
  );

  // Proxy Configuration
  ipcMain.handle(
    'mobile:configure-proxy',
    async (_, serial: string, proxyHost: string, proxyPort: number, fallbackName?: string) => {
      const resolvedSerial = await resolveEmulatorSerial(serial, fallbackName);
      return await configureEmulatorProxy(resolvedSerial || serial, proxyHost, proxyPort);
    },
  );

  ipcMain.handle('mobile:clear-proxy', async (_, serial: string, fallbackName?: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial, fallbackName);
    return await clearEmulatorProxy(resolvedSerial || serial);
  });

  ipcMain.handle(
    'mobile:setup-complete-proxy',
    async (_, serial: string, proxyHost: string, proxyPort: number, fallbackName?: string) => {
      const resolvedSerial = await resolveEmulatorSerial(serial, fallbackName);
      return await setupCompleteProxy(resolvedSerial || serial, proxyHost, proxyPort, (status) => {
        const win = windowManager.getMainWindow();
        if (win) {
          win.webContents.send('mobile:proxy-progress', status);
        }
      });
    },
  );

  ipcMain.handle('mobile:install-ca-cert', async (_, serial: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) return false;

    try {
      const caPath = getProxyCACertPath();
      const win = windowManager.getMainWindow();

      return await setupProxyCertificate(resolvedSerial, caPath, (status) => {
        if (win) win.webContents.send('mobile:install-cert-progress', status);
      });
    } catch (e) {
      console.error('Failed to install CA cert:', e);
      return false;
    }
  });

  // App Management
  ipcMain.handle('mobile:install-apk', async (_, serial: string, apkPath: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    return await installAPK(resolvedSerial || serial, apkPath, (status) => {
      const win = windowManager.getMainWindow();
      if (win) {
        win.webContents.send('mobile:install-progress', status);
      }
    });
  });

  ipcMain.handle('mobile:uninstall-app', async (_, serial: string, packageName: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    return await uninstallApp(resolvedSerial || serial, packageName);
  });

  ipcMain.handle('mobile:launch-app', async (_, serial: string, packageName: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    return await launchApp(resolvedSerial || serial, packageName);
  });

  ipcMain.handle('mobile:stop-app', async (_, serial: string, packageName: string) => {
    return await stopApp(serial, packageName);
  });

  ipcMain.handle('mobile:check-app-installed', async (_, serial: string, packageName: string) => {
    return await isAppInstalled(serial, packageName);
  });

  ipcMain.handle('mobile:list-packages', async (_, serial: string) => {
    return await getInstalledPackages(serial);
  });

  // Profile Management
  ipcMain.handle('mobile:get-profiles', async () => {
    return getAllProfiles();
  });

  ipcMain.handle('mobile:get-profile', async (_, profileId: string) => {
    return getProfileById(profileId);
  });

  ipcMain.handle(
    'mobile:create-profile',
    async (_, profileData: Omit<GenymotionProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
      return createProfile(profileData);
    },
  );

  ipcMain.handle(
    'mobile:update-profile',
    async (_, profileId: string, updates: Partial<GenymotionProfile>) => {
      return updateProfile(profileId, updates);
    },
  );

  ipcMain.handle('mobile:delete-profile', async (_, profileId: string) => {
    return deleteProfile(profileId);
  });

  // Logcat streaming
  ipcMain.handle('mobile:start-logcat', async (_, serial: string) => {
    const requestTime = Date.now();
    lastLogcatRequestTime = requestTime;

    try {
      const resolvedSerial = await resolveEmulatorSerial(serial);

      if (lastLogcatRequestTime !== requestTime) {
        return false;
      }

      if (!resolvedSerial) {
        console.error('[Logcat] ERROR: Could not resolve emulator serial!');
        console.error(`[Logcat] Input was: "${serial}"`);
        throw new Error('Emulator serial not found');
      }

      if (activeLogcatProcess) {
        try {
          activeLogcatProcess.kill();
        } catch (e) {
          // ignore
        }
        activeLogcatProcess = null;
      }

      activeLogcatProcess = spawn('adb', ['-s', resolvedSerial, 'logcat', '-v', 'time'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let logcatBuffer = '';

      if (activeLogcatProcess.stdout) {
        activeLogcatProcess.stdout.on('data', (data) => {
          logcatBuffer += data.toString();

          let lineEnd = logcatBuffer.indexOf('\n');
          while (lineEnd !== -1) {
            const line = logcatBuffer.substring(0, lineEnd).trim();
            logcatBuffer = logcatBuffer.substring(lineEnd + 1);

            if (line) {
              const win = windowManager.getMainWindow();
              if (win && !win.isDestroyed()) {
                win.webContents.send('mobile:logcat-output', line);
              } else {
                console.error('[Logcat] ERROR: Main window not available!');
              }
            }

            lineEnd = logcatBuffer.indexOf('\n');
          }
        });
      } else {
        console.error('[Logcat] ERROR: Process stdout is null!');
      }

      if (activeLogcatProcess.stderr) {
        activeLogcatProcess.stderr.on('data', (data) => {
          console.error('[Logcat Error]', data.toString());
        });
      }

      activeLogcatProcess.on('exit', () => {
        activeLogcatProcess = null;
      });

      activeLogcatProcess.on('error', (err) => {
        console.error('[Logcat] Process error:', err);
      });
      return true;
    } catch (e) {
      console.error('[Logcat] Failed to start:', e);
      return false;
    }
  });

  ipcMain.handle('mobile:stop-logcat', async () => {
    if (activeLogcatProcess) {
      activeLogcatProcess.kill();
      activeLogcatProcess = null;
    }
    return true;
  });
}