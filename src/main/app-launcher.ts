import { app, BrowserWindow } from 'electron';
import { spawn, execFile } from 'child_process';
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
  // For CDP mode, we don't want to use the proxy because CDP captures requests directly
  const useProxy = !cdpPort;
  if (useProxy) {
    appState.activeProxyUrl = proxyUrl;
  }

  const userDataDir = path.join(app.getPath('userData'), 'profiles', profileName);
  fs.mkdirSync(userDataDir, { recursive: true });

  // Find browser (Linux)
  const browsers = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
  let executable = '';
  console.log(`[Launch] Looking for browser executable...`);
  for (const b of browsers) {
    try {
      execSyncChild(`which ${b}`);
      executable = b;
      console.log(`[Launch] Found browser: ${executable}`);
      break;
    } catch {
      console.log(`[Launch] ${b} not found`);
      continue;
    }
  }

  if (!executable) {
    console.error(`[Launch] No browser executable found!`);
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

  console.log(`[Launch] Spawning browser: ${executable} with args:`, args);
  const child = spawn(executable, args, {
    detached: true,
    stdio: 'ignore',
  });
  appState.activeChildProcess = child;
  console.log(`[Launch] Browser spawned with PID: ${child.pid}`);

  child.on('exit', () => {
    if (appState.activeChildProcess === child) {
      appState.activeChildProcess = null;
      if (useProxy) {
        appState.activeProxyUrl = null;
      }
      // Notify renderer that the browser was closed
      const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
      if (win) {
        win.webContents.send('app:process-exit', profileName);
      }
    }
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
  console.log(`[Launch] launchApp called: appName=${appName}, proxyUrl=${proxyUrl}, useEnvInject=${useEnvInject}`);
  if (appName === 'vscode') {
    appState.activeProxyUrl = proxyUrl;
    const debugPort = await findAvailablePort(9222);

    // Inject proxy settings for VSCode Extension Host (Node.js)
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

      // CRITICAL: Force Node.js (Extension Host) to accept self-signed certificates
      if (useEnvInject) {
        env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        env.NODE_EXTRA_CA_CERTS = '/usr/local/share/ca-certificates/phantoma.crt';
      }
    }

    // Using 'code' command assuming it's in PATH
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

    // Connect CDP after short delay
    setTimeout(async () => {
      try {
        await cdpManager.connect(debugPort);
      } catch (e) {
        console.error('[Launch] Failed to connect CDP:', e);
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
        console.log(`[Launch] ENV Inject enabled: NODE_TLS_REJECT_UNAUTHORIZED=0, NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/phantoma.crt`);
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
        injectLocalSSLBypass(child.pid!, (msg) => console.log(`[SSL Bypass] ${msg}`));
        
        // Also inject into child processes (Node.js extension host, etc.)
        setTimeout(() => {
          console.log(`[Frida] Looking for child processes of PID ${child.pid}...`);
          try {
            const { execSync } = require('child_process');
            const output = execSync(`pgrep -P ${child.pid}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            const childPids = output.trim().split('\n').filter(pid => pid.length > 0);
            
            if (childPids.length > 0) {
              console.log(`[Frida] Found ${childPids.length} child processes: ${childPids.join(', ')}`);
              childPids.forEach((pidStr) => {
                const pid = parseInt(pidStr, 10);
                if (!isNaN(pid)) {
                  console.log(`[Frida] Injecting SSL bypass into child PID ${pid}...`);
                  setTimeout(() => {
                    injectLocalSSLBypass(pid, (msg) => 
                      console.log(`[Frida] [Child ${pid}] ${msg}`)
                    );
                  }, 500);
                }
              });
            } else {
              console.log(`[Frida] No child processes found for PID ${child.pid}`);
            }
          } catch (e) {
            console.log(`[Frida] Could not find child processes: ${e.message}`);
          }
        }, 3000);
      }, 2000);
    }

    if (child.stdout) {
      child.stdout.on('data', () => {});
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        console.error(`[Antigravity stderr]: ${data}`);
      });
    }

    child.on('error', (err) => {
      console.error('[Antigravity] Failed to start process:', err);
    });

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
    if (cdpPort) launchCdpPort = cdpPort;
    const result = launchBrowser('https://google.com', appName, proxyUrl, cdpPort);
    
    // If Frida mode, inject SSL bypass after launch
    if (forceMode === 'frida' && result && appState.activeChildProcess?.pid) {
      setTimeout(() => {
        injectLocalSSLBypass(appState.activeChildProcess!.pid!, (msg) => 
          console.log(`[Frida] ${msg}`)
        );
      }, 2000);
    }
    
    return result;
  }

  // Determine URL: use customUrl if provided, else lookup in webApps
  const url = customUrl || webApps[appName];
  if (url) {
    const cdpPort = forceMode === 'cdp' ? await findAvailablePort(9222) : undefined;
    if (cdpPort) launchCdpPort = cdpPort;
    const result = launchBrowser(url, appName, proxyUrl, cdpPort);
    
    // If Frida mode, inject SSL bypass after launch
    if (forceMode === 'frida' && result && appState.activeChildProcess?.pid) {
      setTimeout(() => {
        injectLocalSSLBypass(appState.activeChildProcess!.pid!, (msg) => 
          console.log(`[Frida] ${msg}`)
        );
      }, 2000);
    }
    
    return result;
  }

  // Try to launch as native app if executable path exists
  // appName might be the executable path or a registered app name
  const possibleExePath = appName.includes('/') ? appName : null;
  if (possibleExePath) {
    console.log(`[Launch] Attempting to launch native app: ${possibleExePath}`);
    
    // For native apps, we use spawn directly with proxy env
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
        console.log(`[Launch] Native app ENV Inject enabled: NODE_TLS_REJECT_UNAUTHORIZED=0, NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/phantoma.crt`);
      }
    }

    console.log(`[Launch] Spawning native app: ${possibleExePath}`);
    
    // Normalize path: remove escaped backslashes if present
    let normalizedPath = possibleExePath.replace(/\\ /g, ' ');
    console.log(`[Launch] Normalized path: ${normalizedPath}`);
    
    // Check if executable exists
    if (!fs.existsSync(normalizedPath)) {
      console.error(`[Launch] Executable not found: ${normalizedPath}`);
      return false;
    }
    
    // Use spawn with shell:false and pass executable path directly
    // For paths with spaces, spawn handles it correctly when passed as first argument
    const child = spawn(normalizedPath, [], {
      detached: true,
      stdio: 'ignore',
      env,
      shell: false, // Don't use shell so Frida attaches to correct process
    });
    
    appState.activeChildProcess = child;
    console.log(`[Launch] Native app spawned with PID: ${child.pid}`);
    
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
      console.error(`[Launch] Error spawning native app: ${err.message}`);
    });
    
    child.unref();
    
    // If Frida mode, inject SSL bypass after launch
    if (forceMode === 'frida' && child.pid) {
      console.log(`[Frida] Scheduling SSL bypass injection for PID ${child.pid} in 2s...`);
      setTimeout(() => {
        console.log(`[Frida] Injecting SSL bypass into PID ${child.pid}...`);
        injectLocalSSLBypass(child.pid!, (msg) => 
          console.log(`[Frida] ${msg}`)
        );
        
        // Also inject into child processes (e.g., Node.js extension host)
        setTimeout(() => {
          console.log(`[Frida] Looking for child processes of PID ${child.pid}...`);
          try {
            const { execSync } = require('child_process');
            // Find all child processes using pgrep -P
            const output = execSync(`pgrep -P ${child.pid}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            const childPids = output.trim().split('\n').filter(pid => pid.length > 0);
            
            if (childPids.length > 0) {
              console.log(`[Frida] Found ${childPids.length} child processes: ${childPids.join(', ')}`);
              childPids.forEach((pidStr) => {
                const pid = parseInt(pidStr, 10);
                if (!isNaN(pid)) {
                  console.log(`[Frida] Injecting SSL bypass into child PID ${pid}...`);
                  setTimeout(() => {
                    injectLocalSSLBypass(pid, (msg) => 
                      console.log(`[Frida] [Child ${pid}] ${msg}`)
                    );
                  }, 500);
                }
              });
            } else {
              console.log(`[Frida] No child processes found for PID ${child.pid}`);
            }
          } catch (e) {
            console.log(`[Frida] Could not find child processes: ${e.message}`);
          }
        }, 3000);
      }, 2000);
    }
    
    console.log(`[Launch] Native app launched with PID: ${child.pid}`);
    return true;
  }

  console.warn(`[Launch] Unknown app: ${appName}`);
  return false;
}
