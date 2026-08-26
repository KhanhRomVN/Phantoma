import { app, BrowserWindow } from 'electron';
/**
 * ------------------------------------------------------------------
 * Trình khởi chạy ứng dụng
 * ------------------------------------------------------------------
 * Khởi chạy các ứng dụng đích với hỗ trợ proxy, CDP và Frida.
 * Hỗ trợ các chế độ khởi chạy browser, Electron, native và CDP.
 *
 * Hàm chính:
 * - launchApp() : Khởi chạy ứng dụng với cấu hình đã cho
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Node.js ──
import { spawn, execSync as execSyncChild } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ── Internal ──
import { cdpManager } from './features/cdp';
import { findAvailablePort } from './utils/net';
import { appState, setTargetProcess, removeTargetProcess } from './shared/state';
import { injectLocalSSLBypass } from './utils/frida';
import { logger } from './utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────
/** CDP port used during launch — exposed for IPC handlers to retrieve */
export let launchCdpPort: number | null = null;

// Helper to launch browser
function launchBrowser(
  url: string,
  profileName: string,
  proxyUrl: string,
  cdpPort?: number,
  targetId?: string, // Add targetId parameter
): boolean {
  // For CDP mode, we don't want to use the proxy because CDP captures requests directly
  const useProxy = !cdpPort;
  if (useProxy) {
    appState.activeProxyUrl = proxyUrl;
  }

  const userDataDir = path.join(app.getPath('userData'), 'profiles', profileName);
  fs.mkdirSync(userDataDir, { recursive: true });

  // Find browser (Linux)
  const browsers = [
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    'brave-browser',
    'microsoft-edge-stable',
  ];
  let executable = '';
  for (const b of browsers) {
    try {
      const result = execSyncChild(`which ${b}`, { encoding: 'utf8' });
      executable = result.trim();
      break;
    } catch {
      logger.warn(`[AppLauncher] Browser not found: ${b}`);
      continue;
    }
  }

  if (!executable) {
    logger.error('[AppLauncher] No browser executable found! Tried:', browsers);
    return false;
  }

  const args = [
    '--ignore-certificate-errors',
    '--ignore-certificate-errors-spki-list',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-http2',
    '--disable-quic',
    `--user-data-dir=${userDataDir}`,
    url,
  ];

  // Only add proxy flag if NOT in CDP mode
  if (useProxy) {
    args.push(`--proxy-server=${proxyUrl}`);
  }

  // Add CDP remote debugging if port is specified
  if (cdpPort) {
    args.push(`--remote-debugging-port=${cdpPort}`);
  }

  const child = spawn(executable, args, {
    detached: true,
    stdio: 'ignore',
  });

  // Store in both old (global) and new (per-target) state
  appState.activeChildProcess = child;
  if (targetId) {
    setTargetProcess(targetId, child);
  }

  child.on('exit', (code, signal) => {
    if (appState.activeChildProcess === child) {
      appState.activeChildProcess = null;
      if (useProxy) {
        appState.activeProxyUrl = null;
      }
      const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
      if (win) {
        win.webContents.send('app:process-exit', profileName);
      }
    }
    // Also cleanup from target process map
    if (targetId) {
      removeTargetProcess(targetId);
    }
  });

  child.on('error', (err) => {
    logger.error('[AppLauncher] Browser process error:', err);
  });

  child.unref();
  return true;
}

export async function launchApp(
  appName: string,
  proxyUrl: string,
  customUrl?: string,
  forceMode?: 'browser' | 'electron' | 'native' | 'cdp' | 'frida',
  useEnvInject?: boolean,
  targetId?: string, // Add targetId parameter
): Promise<boolean> {
  if (appName === 'vscode') {
    appState.activeProxyUrl = proxyUrl;
    const debugPort = await findAvailablePort(9222);

    const env = { ...process.env };
    if (proxyUrl) {
      env.http_proxy = proxyUrl;
      env.https_proxy = proxyUrl;
      env.HTTP_PROXY = proxyUrl;
      env.HTTPS_PROXY = proxyUrl;
      env.all_proxy = proxyUrl;
      env.ALL_PROXY = proxyUrl;
      env.no_proxy = '';
      env.NO_PROXY = '';

      if (useEnvInject) {
        env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        env.NODE_EXTRA_CA_CERTS = '/usr/local/share/ca-certificates/phantoma.crt';
      }
    }

    const child = spawn(
      'code',
      [
        '--wait',
        '--new-window',
        '--proxy-server=' + proxyUrl,
        '--ignore-certificate-errors',
        `--remote-debugging-port=${debugPort}`,
        '.',
      ],
      {
        detached: true,
        stdio: 'ignore',
        shell: true,
        env,
      },
    );
    appState.activeChildProcess = child;

    child.on('exit', () => {
      if (appState.activeChildProcess === child) {
        appState.activeChildProcess = null;
        appState.activeProxyUrl = null;
        const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
        if (win) {
          win.webContents.send('app:process-exit', appName);
        }
      }
    });

    child.unref();

    setTimeout(async () => {
      try {
        await cdpManager.connect(debugPort);
      } catch {
        logger.warn('[AppLauncher] CDP connection failed silently');
      }
    }, 3000);

    return true;
  }

  if (appName === 'antigravity') {
    appState.activeProxyUrl = proxyUrl;
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.ELECTRON_NO_ATTACH_CONSOLE;
    delete env.ELECTRON_EXEC_PATH;
    delete env.ATOM_SHELL_INTERNAL_RUN_AS_NODE;

    if (proxyUrl) {
      env.http_proxy = proxyUrl;
      env.https_proxy = proxyUrl;
      env.HTTP_PROXY = proxyUrl;
      env.HTTPS_PROXY = proxyUrl;
      env.all_proxy = proxyUrl;
      env.ALL_PROXY = proxyUrl;
      env.no_proxy = 'localhost,127.0.0.1';
      env.NO_PROXY = 'localhost,127.0.0.1';
      if (useEnvInject) {
        env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        env.NODE_EXTRA_CA_CERTS = '/usr/local/share/ca-certificates/phantoma.crt';
      }
    }

    const args = [
      '--wait',
      '--new-window',
      '--verbose',
      '--proxy-server=' + proxyUrl,
      '--ignore-certificate-errors',
      '--disable-http2',
      '.',
    ];

    const child = spawn('/usr/bin/antigravity', args, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env,
    });
    appState.activeChildProcess = child;

    if (child.pid) {
      setTimeout(() => {
        injectLocalSSLBypass(child.pid!, () => {});
        setTimeout(() => {
          try {
            const { execSync } = require('child_process');
            const output = execSync(`pgrep -P ${child.pid}`, {
              encoding: 'utf8',
              stdio: ['pipe', 'pipe', 'ignore'],
            });
            const childPids = output
              .trim()
              .split('\n')
              .filter((pid: string) => pid.length > 0);
            if (childPids.length > 0) {
              childPids.forEach((pidStr: string) => {
                const pid = parseInt(pidStr, 10);
                if (!isNaN(pid)) {
                  setTimeout(() => {
                    injectLocalSSLBypass(pid, () => {});
                  }, 500);
                }
              });
            }
          } catch {
            logger.warn('[AppLauncher] Failed to find child processes');
          }
        }, 3000);
      }, 2000);
    }

    if (child.stdout) {
      child.stdout.on('data', () => {});
    }
    if (child.stderr) {
      child.stderr.on('data', () => {});
    }
    child.on('error', () => {});
    child.on('exit', () => {
      if (appState.activeChildProcess === child) {
        appState.activeChildProcess = null;
        appState.activeProxyUrl = null;
      }
    });
    child.unref();
    return true;
  }

  // All Websites - launch browser with Google as default start page
  if (appName === '__all_websites__') {
    const cdpPort = forceMode === 'cdp' ? await findAvailablePort(9222) : undefined;
    if (cdpPort) {
      launchCdpPort = cdpPort;
    }
    const result = launchBrowser('https://google.com', appName, proxyUrl, cdpPort, targetId);

    if (forceMode === 'cdp' && result && cdpPort) {
      setTimeout(async () => {
        try {
          const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
          if (win) cdpManager.setMainWindow(win);
          await cdpManager.connect(cdpPort);
        } catch (err) {
          logger.error('[AppLauncher] CDP connection failed:', err);
        }
      }, 2000);
    }

    if (forceMode === 'frida' && result && appState.activeChildProcess?.pid) {
      setTimeout(() => {
        injectLocalSSLBypass(appState.activeChildProcess!.pid!, () => {});
      }, 2000);
    }

    return result;
  }

  // Determine URL: use customUrl if provided
  const url = customUrl;
  if (url) {
    const cdpPort = forceMode === 'cdp' ? await findAvailablePort(9222) : undefined;
    if (cdpPort) {
      launchCdpPort = cdpPort;
    }
    const result = launchBrowser(url, appName, proxyUrl, cdpPort, targetId);

    if (forceMode === 'cdp' && result && cdpPort) {
      setTimeout(async () => {
        try {
          const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
          if (win) cdpManager.setMainWindow(win);
          await cdpManager.connect(cdpPort);
        } catch (err) {
          logger.error('[AppLauncher] CDP connection failed:', err);
        }
      }, 2000);
    }

    if (forceMode === 'frida' && result && appState.activeChildProcess?.pid) {
      setTimeout(() => {
        injectLocalSSLBypass(appState.activeChildProcess!.pid!, () => {});
      }, 2000);
    }

    return result;
  }

  // Try to launch as native app if executable path exists
  const possibleExePath = appName.includes('/') ? appName : null;
  if (possibleExePath) {
    const env = { ...process.env };
    if (proxyUrl) {
      env.http_proxy = proxyUrl;
      env.https_proxy = proxyUrl;
      env.HTTP_PROXY = proxyUrl;
      env.HTTPS_PROXY = proxyUrl;
      env.all_proxy = proxyUrl;
      env.ALL_PROXY = proxyUrl;
      env.NO_PROXY = 'localhost,127.0.0.1';
      env.no_proxy = 'localhost,127.0.0.1';
      if (useEnvInject) {
        env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        env.NODE_EXTRA_CA_CERTS = '/usr/local/share/ca-certificates/phantoma.crt';
      }
    }

    let normalizedPath = possibleExePath.replace(/\\ /g, ' ');
    if (!fs.existsSync(normalizedPath)) {
      logger.error(`[AppLauncher] Executable not found: ${normalizedPath}`);
      return false;
    }

    const child = spawn(normalizedPath, [], {
      detached: true,
      stdio: 'ignore',
      env,
      shell: false,
    });

    appState.activeChildProcess = child;

    child.on('exit', () => {
      if (appState.activeChildProcess === child) {
        appState.activeChildProcess = null;
        appState.activeProxyUrl = null;
        const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
        if (win) {
          win.webContents.send('app:process-exit', appName);
        }
      }
    });

    child.on('error', (err) => {
      logger.error('[AppLauncher] Native app error:', err);
    });

    child.unref();

    if (forceMode === 'frida' && child.pid) {
      setTimeout(() => {
        injectLocalSSLBypass(child.pid!, () => {});
        setTimeout(() => {
          try {
            const { execSync } = require('child_process');
            const output = execSync(`pgrep -P ${child.pid}`, {
              encoding: 'utf8',
              stdio: ['pipe', 'pipe', 'ignore'],
            });
            const childPids = output
              .trim()
              .split('\n')
              .filter((pid: string) => pid.length > 0);
            if (childPids.length > 0) {
              childPids.forEach((pidStr: string) => {
                const pid = parseInt(pidStr, 10);
                if (!isNaN(pid)) {
                  setTimeout(() => {
                    injectLocalSSLBypass(pid, () => {});
                  }, 500);
                }
              });
            }
          } catch {
            logger.warn('[AppLauncher] Failed to find child processes');
          }
        }, 3000);
      }, 2000);
    }

    return true;
  }

  logger.error(
    `[AppLauncher] Cannot launch app: ${appName} - not found in webApps and not a valid path`,
  );
  return false;
}
