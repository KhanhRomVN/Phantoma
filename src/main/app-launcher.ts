import { app, BrowserWindow } from 'electron';
import { spawn, execSync } from 'child_process';
import { exec as execAsync } from 'child_process';
import { promisify } from 'util';
const exec = promisify(execAsync);
import * as fs from 'fs';
import * as path from 'path';
import { cdpManager } from './features/cdp';
import { createGenericWebWindow, GenericWebWindowOptions } from './features/generic-web';
import { findAvailablePort } from './utils/net';
import { userAppStore } from './store/apps';
import { appState } from './shared/state';
import {
  configureEmulatorProxy,
  launchApp as launchMobileApp,
} from './utils/mobile-proxy-config';
import { detectAllEmulators, resolveEmulatorSerial } from './utils/mobile-detector';
import { injectLocalSSLBypass, ensurePtraceScope } from './utils/frida';
import { execSync as execSyncChild } from 'child_process';

// App Configurations Map for Electron Mode
const electronApps: Record<string, { url: string; options?: GenericWebWindowOptions }> = {
  'claude-web': { url: 'https://claude.ai' },
  'deepseek-electron': {
    url: 'https://chat.deepseek.com',
    options: { clearSession: true, useCloudflareBypass: true },
  },
  'mistral-electron': { url: 'https://console.mistral.ai/build/playground' },
  'kimi-electron': { url: 'https://www.kimi.com/' },
  'chatgpt-electron': { url: 'https://chatgpt.com', options: { useCloudflareBypass: true } },
  'qwen-electron': { url: 'https://chat.qwen.ai/' },
  'grok-electron': { url: 'https://grok.com/' },
  'groq-electron': {
    url: 'https://console.groq.com/playground',
  },
  'cohere-electron': { url: 'https://dashboard.cohere.com/playground/chat' },
  'perplexity-electron': { url: 'https://www.perplexity.ai/' },
  'phind-electron': { url: 'https://www.phind.com/' },
  'gemini-electron': { url: 'https://gemini.google.com/app?hl=vi' },
  'duckduckgo-electron': {
    url: 'https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat&duckai=1',
  },
  'context7-electron': { url: 'https://context7.com/chat' },
  'askcodi-electron': { url: 'https://www.askcodi.com/chat' },
  'deepseek-r1-together-electron': {
    url: 'https://api.together.ai/playground/deepseek-ai/DeepSeek-R1-0528-tput',
  },
  'zai-electron': {
    url: 'https://chat.z.ai/',
    options: { clearSession: true },
  },
  'huggingface-electron': { url: 'https://huggingface.co/chat/' },
  'poe-electron': { url: 'https://poe.com/' },
  'elicit-electron': { url: 'https://elicit.com/' },
  'lmarena-electron': { url: 'https://lmarena.ai/vi/c/new?mode=direct' },
};

// Web Apps
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
function launchBrowser(url: string, profileName: string, proxyUrl: string, cdpPort?: number): boolean {
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
  for (const b of browsers) {
    try {
      execSyncChild(`which ${b}`);
      executable = b;
      break;
    } catch {
      continue;
    }
  }

  if (!executable) {
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
  appState.activeChildProcess = child;

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
  _customUrl?: string,
  forceMode?: 'browser' | 'electron' | 'native',
): Promise<boolean> {
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
      env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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
      env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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
    return launchBrowser('https://google.com', appName, proxyUrl);
  }

  if (electronApps[appName]) {
    if (forceMode === 'browser') {
      const url = electronApps[appName].url;
      return launchBrowser(url, appName, proxyUrl);
    }

    appState.activeProxyUrl = proxyUrl;
    const config = electronApps[appName];
    const win = await createGenericWebWindow(appName, config.url, proxyUrl, config.options);
    return !!win;
  }

  if (webApps[appName]) {
    if (forceMode === 'electron') {
      appState.activeProxyUrl = proxyUrl;
      const win = await createGenericWebWindow(appName, webApps[appName], proxyUrl, {
        useCloudflareBypass: true,
      });
      return !!win;
    }
    return launchBrowser(webApps[appName], appName, proxyUrl);
  }

  // Check User Apps
  const userApp = userAppStore.getAppById(appName);
  if (userApp) {
    if (userApp.platform === 'web' && userApp.url) {
      const modeToUse = forceMode || userApp.mode;

      if (modeToUse === 'browser' || modeToUse === 'cdp') {
        const cdpPort = modeToUse === 'cdp' ? await findAvailablePort(9223) : undefined;
        return launchBrowser(userApp.url, userApp.id, proxyUrl, cdpPort);
      } else if (modeToUse === 'electron') {
        appState.activeProxyUrl = proxyUrl;
        const win = await createGenericWebWindow(userApp.id, userApp.url, proxyUrl, {
          title: userApp.name,
          useCloudflareBypass: true,
        });
        return !!win;
      }
    } else if (
      userApp.platform === 'pc' &&
      userApp.mode === 'native' &&
      userApp.executablePath
    ) {
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
        env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      const debugPort = await findAvailablePort(9222);
      const args: string[] = [];
      args.push(`--remote-debugging-port=${debugPort}`);

      let initialPids: string[] = [];
      if (userApp.name.toLowerCase().includes('antigravity')) {
        try {
          initialPids = execSyncChild('pgrep -f antigravity')
            .toString()
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        } catch (e) {
          // No processes running yet
        }
      }

      const child = spawn(userApp.executablePath, args, {
        detached: true,
        stdio: 'ignore',
        env,
      });
      child.unref();

      setTimeout(async () => {
        try {
          await cdpManager.connect(debugPort);
        } catch (e) {
          console.error('[Launch] Failed to connect CDP for Native App:', e);
        }
      }, 5000);

      if (userApp.name.toLowerCase().includes('antigravity')) {
        const injectedPids = new Set<string>();
        const startTime = Date.now();
        const POLL_DURATION = 60000;
        const POLL_INTERVAL = 1000;

        const pollAndInject = async () => {
          if (Date.now() - startTime > POLL_DURATION) {
            return;
          }

          try {
            await ensurePtraceScope((msg) => console.log(`[Launch] ${msg}`));

            let currentPids: string[] = [];
            try {
              const { stdout } = await exec('pgrep -f antigravity');
              currentPids = stdout.trim().split(/\s+/).filter(Boolean);
            } catch (e) {
              // Ignore errors
            }

            const newPids = currentPids.filter(
              (pid) => !initialPids.includes(pid) && !injectedPids.has(pid),
            );

            if (newPids.length > 0) {
              for (const pid of newPids) {
                const pidNum = parseInt(pid, 10);
                try {
                  const { stdout: comm } = await exec(`ps -p ${pidNum} -o comm=`);
                  const procName = comm.trim().toLowerCase();

                  if (
                    procName.includes('antigravi') ||
                    procName.includes('electron') ||
                    procName.includes('chrome')
                  ) {
                    injectedPids.add(pid);
                  }
                } catch (e) {
                  // Ignore errors
                }
              }
            }
          } catch (e) {
            console.error('[Launch] Polling error:', e);
          }

          setTimeout(pollAndInject, POLL_INTERVAL);
        };

        setTimeout(pollAndInject, 500);
      }

      return true;
    } else if (userApp.platform === 'android') {
      let serial = userApp.emulatorSerial;

      if (!userApp.packageName) {
        if (serial) {
          const vmName = serial;
          const emulators = await detectAllEmulators();

          const isRunning = emulators.some((e) => {
            const storedName = vmName.toLowerCase();
            const runningName = e.name.toLowerCase();
            const runningSerial = e.serial.toLowerCase();
            const runningId = (e.id || '').toLowerCase();

            if (
              runningName === storedName ||
              runningSerial === storedName ||
              runningId === storedName
            ) {
              return true;
            }

            const isStoredUUID =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                storedName,
              );

            if (
              !isStoredUUID &&
              (storedName.includes(runningName) || runningName.includes(storedName))
            ) {
              return true;
            }

            return false;
          });

          if (isRunning) {
            return true;
          } else {
            return false;
          }
        }
        return false;
      }

      if (!serial) {
        const emulators = await detectAllEmulators();
        if (emulators.length > 0) {
          serial = emulators[0].serial;
        }
      }

      if (!serial) {
        console.error('No running emulator found');
        return false;
      }

      const resolvedSerial = await resolveEmulatorSerial(serial, userApp.name);
      if (resolvedSerial) {
        serial = resolvedSerial;
      }

      try {
        const url = new URL(proxyUrl);
        const host = url.hostname;
        const port = parseInt(url.port);

        await configureEmulatorProxy(serial, host, port);
      } catch (e) {
        console.error('Failed to configure proxy for mobile app', e);
      }

      return await launchMobileApp(serial, userApp.packageName);
    } else if (userApp.platform === 'cli' && userApp.executablePath) {
      const env = { ...process.env };

      if (proxyUrl) {
        env.http_proxy = proxyUrl;
        env.https_proxy = proxyUrl;
        env.HTTP_PROXY = proxyUrl;
        env.HTTPS_PROXY = proxyUrl;
        env.all_proxy = proxyUrl;
        env.ALL_PROXY = proxyUrl;
        env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      const terminals = ['gnome-terminal', 'konsole', 'xterm', 'kitty', 'alacritty'];
      let terminal = '';
      for (const t of terminals) {
        try {
          execSyncChild(`which ${t}`);
          terminal = t;
          break;
        } catch {
          continue;
        }
      }

      if (terminal) {
        let cmd = '';
        if (terminal === 'gnome-terminal') {
          cmd = `gnome-terminal -- sh -c "${userApp.executablePath}; exec bash"`;
        } else if (terminal === 'konsole') {
          cmd = `konsole -e sh -c "${userApp.executablePath}; exec bash"`;
        } else {
          cmd = `${terminal} -e "sh -c '${userApp.executablePath}; exec bash'"`;
        }

        spawn(cmd, [], {
          detached: true,
          shell: true,
          env,
        });
        return true;
      } else {
        const child = spawn(userApp.executablePath, [], {
          detached: true,
          stdio: 'ignore',
          shell: true,
          env,
        });
        child.unref();
        return true;
      }
    }
  }

  return false;
}