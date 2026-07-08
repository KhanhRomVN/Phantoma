import { app, BrowserWindow } from 'electron';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { cdpManager } from './features/cdp';
import { findAvailablePort } from './utils/net';
import { appState } from './shared/state';
import { injectLocalSSLBypass } from './utils/frida';
import { execSync as execSyncChild } from 'child_process';

/** CDP port used during launch — exposed for IPC handlers to retrieve */
export let launchCdpPort: number | null = null;

// Web Apps - only browser mode
const webApps: Record<string, string> = {
  'deepseek-browser': 'https://chat.deepseek.com',
  'chatgpt-browser': 'https://chatgpt.com',
  'google-aistudio': 'https://aistudio.google.com/prompts/new_chat',
  'gemini-browser': 'https://gemini.google.com/app?hl=vi',
  'kimi-browser': 'https://www.kimi.com/',
  'duckduckgo-browser': 'https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat&duckai=1',
  'qwen-browser': 'https://chat.qwen.ai/',
  'groq-browser': 'https://console.groq.com/playground',
  'grok-browser': 'https://grok.com/',
  'cohere-browser': 'https://dashboard.cohere.com/playground/chat',
  'mistral-browser': 'https://console.mistral.ai/build/playground',
  'perplexity-browser': 'https://www.perplexity.ai/',
  'phind-browser': 'https://www.phind.com/',
  'context7-browser': 'https://context7.com/chat',
  'askcodi-browser': 'https://www.askcodi.com/chat',
  'deepseek-r1-together-browser':
    'https://api.together.ai/playground/deepseek-ai/DeepSeek-R1-0528-tput',
  'zai-browser': 'https://chat.z.ai/',
  'huggingface-browser': 'https://huggingface.co/chat/',
  'poe-browser': 'https://poe.com/',
  'elicit-browser': 'https://elicit.com/',
  'lmarena-browser': 'https://lmarena.ai/vi/c/new?mode=direct',
};

// Helper to launch browser
function launchBrowser(
  url: string,
  profileName: string,
  proxyUrl: string,
  cdpPort?: number,
): boolean {
  console.log(`[AppLauncher] launchBrowser() called: url=${url}, profile=${profileName}, cdpPort=${cdpPort}`);
  
  // For CDP mode, we don't want to use the proxy because CDP captures requests directly
  const useProxy = !cdpPort;
  if (useProxy) {
    appState.activeProxyUrl = proxyUrl;
  }

  const userDataDir = path.join(app.getPath('userData'), 'profiles', profileName);
  fs.mkdirSync(userDataDir, { recursive: true });

  // Find browser (Linux)
  const browsers = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'brave-browser', 'microsoft-edge-stable'];
  let executable = '';
  console.log('[AppLauncher] Searching for browser executable...');
  for (const b of browsers) {
    try {
      const result = execSyncChild(`which ${b}`, { encoding: 'utf8' });
      executable = result.trim();
      console.log(`[AppLauncher] Found browser: ${executable}`);
      break;
    } catch {
      console.log(`[AppLauncher] Browser ${b} not found`);
      continue;
    }
  }

  if (!executable) {
    console.error('[AppLauncher] No browser executable found! Tried:', browsers);
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

  console.log(`[AppLauncher] Launching browser: ${executable} with args:`, args.join(' '));

  const child = spawn(executable, args, {
    detached: true,
    stdio: 'ignore',
  });
  
  console.log(`[AppLauncher] Browser process spawned with PID: ${child.pid}`);
  appState.activeChildProcess = child;

  child.on('exit', (code, signal) => {
    console.log(`[AppLauncher] Browser process exited: code=${code}, signal=${signal}`);
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
  });

  child.on('error', (err) => {
    console.error('[AppLauncher] Browser process error:', err);
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
): Promise<boolean> {
  console.log(`[AppLauncher] launchApp() called: appName=${appName}, forceMode=${forceMode}, customUrl=${customUrl}`);

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
        // CDP connection failed silently
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
            const output = execSync(`pgrep -P ${child.pid}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            const childPids = output.trim().split('\n').filter((pid: string) => pid.length > 0);
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
            // Failed to find child processes
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
      console.log(`[AppLauncher] CDP port assigned: ${launchCdpPort}`);
    }
    console.log(`[AppLauncher] Launching all websites with forceMode=${forceMode}, cdpPort=${cdpPort}`);
    const result = launchBrowser('https://google.com', appName, proxyUrl, cdpPort);
    console.log(`[AppLauncher] launchBrowser result: ${result}`);
    
    if (forceMode === 'cdp' && result && cdpPort) {
      console.log(`[AppLauncher] Will connect to CDP on port ${cdpPort} after 2s`);
      setTimeout(async () => {
        try {
          const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
          if (win) cdpManager.setMainWindow(win);
          console.log(`[AppLauncher] Connecting to CDP on port ${cdpPort}...`);
          await cdpManager.connect(cdpPort);
          console.log(`[AppLauncher] CDP connection successful`);
        } catch (err) {
          console.error('[AppLauncher] CDP connection failed:', err);
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

  // Determine URL: use customUrl if provided, else lookup in webApps
  const url = customUrl || webApps[appName];
  if (url) {
    const cdpPort = forceMode === 'cdp' ? await findAvailablePort(9222) : undefined;
    if (cdpPort) {
      launchCdpPort = cdpPort;
      console.log(`[AppLauncher] CDP port assigned: ${launchCdpPort}`);
    }
    console.log(`[AppLauncher] Launching app ${appName} with forceMode=${forceMode}, cdpPort=${cdpPort}, url=${url}`);
    const result = launchBrowser(url, appName, proxyUrl, cdpPort);
    console.log(`[AppLauncher] launchBrowser result: ${result}`);
    
    if (forceMode === 'cdp' && result && cdpPort) {
      console.log(`[AppLauncher] Will connect to CDP on port ${cdpPort} after 2s`);
      setTimeout(async () => {
        try {
          const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
          if (win) cdpManager.setMainWindow(win);
          console.log(`[AppLauncher] Connecting to CDP on port ${cdpPort}...`);
          await cdpManager.connect(cdpPort);
          console.log(`[AppLauncher] CDP connection successful`);
        } catch (err) {
          console.error('[AppLauncher] CDP connection failed:', err);
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
      console.error(`[AppLauncher] Executable not found: ${normalizedPath}`);
      return false;
    }
    
    console.log(`[AppLauncher] Launching native app: ${normalizedPath}`);
    const child = spawn(normalizedPath, [], {
      detached: true,
      stdio: 'ignore',
      env,
      shell: false,
    });
    
    appState.activeChildProcess = child;
    console.log(`[AppLauncher] Native app spawned with PID: ${child.pid}`);
    
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
      console.error('[AppLauncher] Native app error:', err);
    });
    
    child.unref();
    
    if (forceMode === 'frida' && child.pid) {
      setTimeout(() => {
        injectLocalSSLBypass(child.pid!, () => {});
        setTimeout(() => {
          try {
            const { execSync } = require('child_process');
            const output = execSync(`pgrep -P ${child.pid}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            const childPids = output.trim().split('\n').filter((pid: string) => pid.length > 0);
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
            // Failed to find child processes
          }
        }, 3000);
      }, 2000);
    }
    
    return true;
  }

  console.error(`[AppLauncher] Cannot launch app: ${appName} - not found in webApps and not a valid path`);
  return false;
}