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
import { emitTargetStatusChanged } from './ipc/target.handlers';

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
      // Emit target stopped event
      emitTargetStatusChanged(targetId, 'stopped');
    }
  });

  child.on('error', (err) => {
    logger.error('[AppLauncher] Browser process error:', err);
  });

  child.unref();
  
  // Emit target started event nếu có targetId
  if (targetId) {
    emitTargetStatusChanged(targetId, 'running', {
      id: targetId,
      title: profileName,
      url: url,
      platform: 'web',
    });
  }
  
  return true;
}

export async function launchApp(
  appName: string,
  proxyUrl: string,
  customUrl?: string,
  forceMode?: 'browser' | 'electron' | 'native' | 'cdp' | 'frida',
  useEnvInject?: boolean,
  targetId?: string, // Add targetId parameter
  useSandbox?: boolean, // Add useSandbox parameter for CLI
  captureMode?: 'proxy' | 'ebpf' | 'packet', // ebpf/packet must NOT inject proxy env (traffic must go direct so ecapture can hook SSL_write/SSL_read)
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

  // Try to launch as native app or CLI command
  // Support both full paths (/usr/bin/app) and command names (code, curl, cline, etc.)
  
  // Check if it's a full path
  const isFullPath = appName.includes('/');
  let executablePath = appName;
  let executableName = appName;

  if (isFullPath) {
    // Normalize path (remove escaped spaces)
    executablePath = appName.replace(/\\ /g, ' ');
    if (!fs.existsSync(executablePath)) {
      logger.error(`[AppLauncher] Executable not found: ${executablePath}`);
      return false;
    }
    // Extract executable name from path for sandbox naming
    executableName = path.basename(executablePath);
  } else {
    // It's a command name, try to find it in PATH using 'which'
    // But prefer global installation over local node_modules
    try {
      // First try to find ALL instances of the command
      const allPaths = execSyncChild(`which -a ${appName} 2>/dev/null || which ${appName}`, {
        encoding: 'utf8',
      }).trim();
      
      // Split by newlines to get all paths
      const paths = allPaths.split('\n').filter((p) => p.length > 0);
      
      // Prefer paths that are NOT in node_modules (global installations)
      const globalPath = paths.find((p) => !p.includes('node_modules'));
      executablePath = globalPath || paths[0] || '';
      
      if (!executablePath) {
        logger.error(`[AppLauncher] Command not found in PATH: ${appName}`);
        return false;
      }
      
      if (globalPath) {
        logger.info(`[AppLauncher] Using global installation: ${executablePath}`);
      } else {
        logger.warn(
          `[AppLauncher] Using local installation (no global found): ${executablePath}`,
        );
      }
      
      executableName = appName;
    } catch {
      logger.error(`[AppLauncher] Command not found in PATH: ${appName}`);
      return false;
    }
  }

  // Create isolated sandbox environment for CLI apps (if useSandbox is true)
  // Default to sandbox mode (true) if not specified
  const shouldUseSandbox = useSandbox !== false;
  
  let sandboxRoot: string;
  let sandboxHome: string;
  let sandboxConfig: string;
  let sandboxCache: string;
  let sandboxData: string;
  let sandboxTemp: string;
  let env: Record<string, string>;

  if (shouldUseSandbox) {
    // Sandbox mode - isolated environment
    const sandboxId = targetId || `${executableName}-${Date.now()}`;
    sandboxRoot = path.join(app.getPath('userData'), 'cli-sandboxes', sandboxId);
    sandboxHome = path.join(sandboxRoot, 'home');
    sandboxConfig = path.join(sandboxRoot, 'config');
    sandboxCache = path.join(sandboxRoot, 'cache');
    sandboxData = path.join(sandboxRoot, 'data');
    sandboxTemp = path.join(sandboxRoot, 'tmp');

    // Create sandbox directories
    fs.mkdirSync(sandboxHome, { recursive: true });
    fs.mkdirSync(sandboxConfig, { recursive: true });
    fs.mkdirSync(sandboxCache, { recursive: true });
    fs.mkdirSync(sandboxData, { recursive: true });
    fs.mkdirSync(sandboxTemp, { recursive: true });

    logger.info(`[AppLauncher] Created CLI sandbox for ${executableName} at: ${sandboxRoot}`);

    // Setup isolated environment variables
    env = {
      // Isolate HOME directory
      HOME: sandboxHome,
      USERPROFILE: sandboxHome, // Windows compat

      // XDG Base Directory Specification - isolate config/cache/data
      XDG_CONFIG_HOME: sandboxConfig,
      XDG_CACHE_HOME: sandboxCache,
      XDG_DATA_HOME: sandboxData,
      XDG_STATE_HOME: path.join(sandboxData, 'state'),
      XDG_RUNTIME_DIR: sandboxTemp,

      // Temp directories
      TMPDIR: sandboxTemp,
      TEMP: sandboxTemp,
      TMP: sandboxTemp,

      // Keep necessary system paths
      PATH: process.env.PATH || '',
      LANG: process.env.LANG || 'en_US.UTF-8',
      TERM: process.env.TERM || 'xterm-256color',

      // Shell
      SHELL: process.env.SHELL || '/bin/bash',

      // Display (for GUI apps)
      DISPLAY: process.env.DISPLAY || ':0',
      WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || '',

      // User info (use sandbox identity)
      USER: 'phantoma-sandbox',
      LOGNAME: 'phantoma-sandbox',
    };
  } else {
    // No sandbox - use system environment
    logger.info(`[AppLauncher] Launching ${executableName} without sandbox (system environment)`);
    
    sandboxRoot = '';
    sandboxHome = process.env.HOME || process.cwd();
    sandboxConfig = '';
    sandboxCache = '';
    sandboxData = '';
    sandboxTemp = process.env.TMPDIR || process.env.TEMP || '/tmp';
    
    // Use current system environment completely
    env = { ...process.env } as Record<string, string>;
    
    // Explicitly ensure we're NOT overriding XDG vars (use system defaults)
    // This allows cline to read from user's actual config location
  }

  // Add proxy settings (both sandbox and no-sandbox modes).
  // Skip entirely when capturing with eBPF/packet — those modes hook at the
  // socket/libssl layer and require the target process to connect directly.
  // If a proxy is injected, the process would connect to 127.0.0.1:PORT, so
  // ecapture would see no SSL_write/SSL_read on the real remote socket.
  const skipProxyEnv = captureMode === 'ebpf' || captureMode === 'packet';
  if (proxyUrl && !skipProxyEnv) {
    env.http_proxy = proxyUrl;
    env.https_proxy = proxyUrl;
    env.HTTP_PROXY = proxyUrl;
    env.HTTPS_PROXY = proxyUrl;
    env.all_proxy = proxyUrl;
    env.ALL_PROXY = proxyUrl;
    
    // NO_PROXY: Only bypass localhost (everything else goes through proxy)
    // Sensitive domains (cline.bot, workos.com) are handled by proxy's SSL bypass list
    // which creates TCP tunnels without decrypting - this allows authentication to work
    // while still capturing connection metadata (host, port, timing)
    const noProxyList = [
      'localhost',
      '127.0.0.1',
    ].join(',');
    
    env.NO_PROXY = noProxyList;
    env.no_proxy = noProxyList;

    if (useEnvInject) {
      env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      env.NODE_EXTRA_CA_CERTS = '/usr/local/share/ca-certificates/phantoma.crt';
    }
  } else if (skipProxyEnv) {
    // Explicitly scrub any inherited proxy vars so nothing leaks into the sandbox
    for (const key of [
      'http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY',
      'all_proxy', 'ALL_PROXY', 'no_proxy', 'NO_PROXY',
      'NODE_TLS_REJECT_UNAUTHORIZED', 'NODE_EXTRA_CA_CERTS',
    ]) {
      delete env[key];
    }
    logger.info(
      `[AppLauncher] captureMode=${captureMode}: proxy env scrubbed, target will connect directly`,
    );
  }

  // For CLI apps, we need to launch them in a terminal emulator
  // Common terminal emulators on Linux
  const terminalEmulators = [
    { cmd: 'gnome-terminal', args: ['--'] },
    { cmd: 'konsole', args: ['-e'] },
    { cmd: 'xfce4-terminal', args: ['-e'] },
    { cmd: 'xterm', args: ['-e'] },
    { cmd: 'alacritty', args: ['-e'] },
    { cmd: 'kitty', args: ['--'] },
    { cmd: 'terminator', args: ['-e'] },
  ];

  let terminal: { cmd: string; args: string[] } | null = null;
  
  // Find available terminal emulator
  for (const term of terminalEmulators) {
    try {
      execSyncChild(`which ${term.cmd}`, { encoding: 'utf8' });
      terminal = term;
      logger.info(`[AppLauncher] Found terminal emulator: ${term.cmd}`);
      break;
    } catch {
      continue;
    }
  }

  if (!terminal) {
    logger.error('[AppLauncher] No terminal emulator found! Install gnome-terminal, konsole, or xterm');
    return false;
  }

  // Create a wrapper script that sets up the environment and runs the app
  const wrapperScript = path.join(sandboxTemp, 'launch.sh');

  // PID file lives at a stable location keyed by targetId so that
  // launchCliWithEbpf can find it without knowing sandboxTemp.
  // The wrapper writes its own PID right before exec'ing the target; because
  // we use exec the PID survives the exec and this is the exact CLI PID.
  const pidFile = path.join(
    app.getPath('userData'),
    'cli-sandboxes',
    targetId || 'default',
    'target.pid',
  );
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  try {
    fs.unlinkSync(pidFile);
  } catch {
    // pidfile did not exist — fine
  }
  
  // For no-sandbox mode, only export proxy-related vars, not ALL env vars
  let envVars: string;
  if (shouldUseSandbox) {
    // Sandbox: export all env vars
    envVars = Object.entries(env)
      .map(([key, value]) => `export ${key}="${value.replace(/"/g, '\\"')}"`)
      .join('\n');
  } else {
    // No-sandbox: only export proxy vars if they exist
    const proxyVars = [
      'http_proxy',
      'https_proxy',
      'HTTP_PROXY',
      'HTTPS_PROXY',
      'all_proxy',
      'ALL_PROXY',
      'NO_PROXY',
      'no_proxy',
      'NODE_TLS_REJECT_UNAUTHORIZED',
      'NODE_EXTRA_CA_CERTS',
    ];
    envVars = Object.entries(env)
      .filter(([key]) => proxyVars.includes(key))
      .map(([key, value]) => `export ${key}="${value.replace(/"/g, '\\"')}"`)
      .join('\n');
  }
  
  const scriptContent = `#!/bin/bash
# Phantoma CLI ${shouldUseSandbox ? 'Sandbox' : 'No-Sandbox'} Launcher
echo "${shouldUseSandbox ? '🔒' : '🔓'} Phantoma CLI ${shouldUseSandbox ? 'Sandbox' : 'No-Sandbox'}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "App: ${executableName}"
${shouldUseSandbox ? `echo "Sandbox: ${sandboxRoot}"` : 'echo "Mode: System environment"'}
${shouldUseSandbox ? `echo "HOME: ${sandboxHome}"` : `echo "HOME: $HOME"`}
echo "Executable: ${executablePath}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show version info
echo "Checking executable info..."
which ${executableName}
${executableName} --version 2>/dev/null || echo "No version flag"
echo ""

# Set environment variables (sandbox: all vars, no-sandbox: only proxy)
${envVars}

# Change to home directory
${shouldUseSandbox ? `cd "${sandboxHome}"` : 'cd "$HOME"'}

# Show current directory
echo "Working directory: \$(pwd)"
echo ""

# Trap to keep terminal open on exit
trap 'echo ""; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; echo "Process exited. Press any key to close..."; read -n 1' EXIT

# Record our PID before exec'ing so the parent can find the target process.
# Using exec preserves the PID when this shell is replaced by the target
# binary (no extra shell wrapper remains).
echo $$ > "${pidFile}"
exec "${executablePath}"
`;

  fs.writeFileSync(wrapperScript, scriptContent, { mode: 0o755 });

  logger.info(`[AppLauncher] Created wrapper script at: ${wrapperScript}`);
  logger.info(`[AppLauncher] Executable path: ${executablePath}`);
  logger.info(`[AppLauncher] Working directory: ${sandboxHome}`);
  logger.info(`[AppLauncher] Sandbox mode: ${shouldUseSandbox}`);

  // Launch terminal with wrapper script
  // Use --wait flag to keep terminal process alive
  const terminalArgs = terminal.cmd === 'gnome-terminal' 
    ? ['--wait', '--', wrapperScript]
    : [...terminal.args, wrapperScript];

  const child = spawn(terminal.cmd, terminalArgs, {
    detached: false, // Don't detach - keep connected to parent
    stdio: ['ignore', 'pipe', 'pipe'], // Capture output for debugging
    shell: false,
  });

  appState.activeChildProcess = child;
  if (targetId) {
    setTargetProcess(targetId, child);
  }

  // Log terminal output for debugging
  if (child.stdout) {
    child.stdout.on('data', (data) => {
      logger.debug(`[AppLauncher] ${executableName} stdout: ${data.toString().trim()}`);
    });
  }
  if (child.stderr) {
    child.stderr.on('data', (data) => {
      logger.debug(`[AppLauncher] ${executableName} stderr: ${data.toString().trim()}`);
    });
  }

  child.on('exit', (code) => {
    logger.info(`[AppLauncher] Terminal exited with code: ${code}`);
    if (appState.activeChildProcess === child) {
      appState.activeChildProcess = null;
      appState.activeProxyUrl = null;
      const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
      if (win) {
        win.webContents.send('app:process-exit', appName);
      }
    }
    // Also cleanup from target process map
    if (targetId) {
      removeTargetProcess(targetId);
      emitTargetStatusChanged(targetId, 'stopped');
    }
  });

  child.on('error', (err) => {
    logger.error('[AppLauncher] Terminal error:', err);
  });

  // Don't unref - keep process referenced so it doesn't exit prematurely
  // child.unref();

  // Emit target started event
  if (targetId) {
    emitTargetStatusChanged(targetId, 'running', {
      id: targetId,
      title: appName,
      url: '',
      platform: isFullPath ? 'pc' : 'cli',
    });
  }

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

// ─── CLI Capture Methods ────────────────────────────────────────────────

import { PacketCapture } from './capture/PacketCapture';
import { EbpfCapture } from './capture/EbpfCapture';
import { AppDebugLauncher } from './capture/AppDebugLauncher';
import { CdpProxy } from './capture/CdpProxy';
import { setCaptureInstance, removeCaptureInstance } from './shared/state';

/**
 * Launch CLI app with eBPF capture
 */
export async function launchCliWithEbpf(
  executablePath: string,
  targetId: string,
  window: BrowserWindow,
  useSandbox?: boolean,
): Promise<boolean> {
  try {
    logger.info(`[AppLauncher] Launching CLI with eBPF: ${executablePath}`);

    // First, launch the app normally (without proxy).
    // captureMode='ebpf' tells launchApp to scrub inherited proxy env vars
    // so the target connects directly — required for SSL_write/SSL_read hooking.
    const launched = await launchApp(
      executablePath,
      '', // No proxy for eBPF
      undefined,
      undefined,
      false,
      targetId,
      useSandbox,
      'ebpf',
    );

    if (!launched) {
      logger.error('[AppLauncher] Failed to launch app for eBPF capture');
      throw new Error('Failed to launch application');
    }

    // Get the terminal process PID
    const terminalProcess = appState.targetProcesses.get(targetId);
    if (!terminalProcess || !terminalProcess.pid) {
      logger.error('[AppLauncher] Terminal process not found');
      throw new Error('Terminal process not found after launch');
    }
    
    const terminalPid = terminalProcess.pid;
    logger.info(`[AppLauncher] Terminal PID: ${terminalPid}`);

    // Wait for the actual CLI app to spawn inside the terminal
    // The terminal launches a shell script which then runs the executable
    logger.info(`[AppLauncher] Waiting for ${path.basename(executablePath)} process to spawn...`);
    
    let actualPid: number | null = null;
    const maxAttempts = 15; // Try for ~7.5 seconds
    const execName = path.basename(executablePath);

    // The wrapper script writes its own PID to a file right before exec'ing
    // the target. Because we use `exec`, the PID is preserved across the
    // exec syscall — so the file contains the exact PID of the running CLI.
    // This is the only reliable way to find the PID when the terminal is
    // gnome-terminal (real child runs under gnome-terminal-server, not under
    // the client process we spawned).
    const pidFile = path.join(
      app.getPath('userData'),
      'cli-sandboxes',
      targetId || 'default',
      'target.pid',
    );
    logger.info(`[AppLauncher] Polling pidfile: ${pidFile}`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        if (fs.existsSync(pidFile)) {
          const raw = fs.readFileSync(pidFile, 'utf8').trim();
          const pid = parseInt(raw, 10);
          if (!isNaN(pid) && pid > 1 && fs.existsSync(`/proc/${pid}`)) {
            actualPid = pid;
            logger.info(`[AppLauncher] Found target PID ${pid} from ${pidFile}`);
            break;
          }
        }
        logger.info(
          `[AppLauncher] Attempt ${attempt + 1}/${maxAttempts}: ${execName} pidfile not ready yet, waiting...`,
        );
      } catch (error) {
        logger.warn(`[AppLauncher] Error reading pidfile:`, error);
      }
    }

    if (!actualPid) {
      logger.error('[AppLauncher] Could not find actual CLI process after waiting');
      throw new Error(`Could not find ${path.basename(executablePath)} process`);
    }

    // Start eBPF capture on the actual CLI process PID
    const ebpfCapture = new EbpfCapture(window);
    await ebpfCapture.start({ targetPid: actualPid });

    // Store capture instance
    setCaptureInstance(targetId, {
      type: 'ebpf',
      instance: ebpfCapture,
      pid: actualPid,
      targetId,
    });

    logger.info(`[AppLauncher] eBPF capture started for ${path.basename(executablePath)} PID ${actualPid}`);
    return true;
  } catch (error) {
    logger.error('[AppLauncher] launchCliWithEbpf failed:', error);
    if (error instanceof Error) {
      logger.error('[AppLauncher] Error message:', error.message);
      logger.error('[AppLauncher] Error stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Launch CLI app with packet capture
 */
export async function launchCliWithPacketCapture(
  executablePath: string,
  targetId: string,
  window: BrowserWindow,
  useSandbox?: boolean,
): Promise<boolean> {
  logger.info(`[AppLauncher] Launching CLI with Packet Capture: ${executablePath}`);

  // Start packet capture BEFORE launching app
  const packetCapture = new PacketCapture(window);
  
  try {
    // Start capturing HTTPS traffic (port 443)
    await packetCapture.start({
      filter: 'tcp port 443',
      interface: 'any',
    });

    logger.info('[AppLauncher] Packet capture started');
  } catch (error) {
    logger.error('[AppLauncher] Failed to start packet capture:', error);
    return false;
  }

  // Launch the app normally (without proxy)
  const launched = await launchApp(
    executablePath,
    '', // No proxy for packet capture
    undefined,
    undefined,
    false,
    targetId,
    useSandbox,
  );

  if (!launched) {
    packetCapture.stop();
    return false;
  }

  // Store capture instance
  setCaptureInstance(targetId, {
    type: 'pcap',
    instance: packetCapture,
    targetId,
  });

  return true;
}

/**
 * Launch CLI app with debug mode
 */
export async function launchCliWithDebugMode(
  executablePath: string,
  targetId: string,
  window: BrowserWindow,
  useSandbox?: boolean,
): Promise<boolean> {
  logger.info(`[AppLauncher] Launching CLI with Debug Mode: ${executablePath}`);

  // Use AppDebugLauncher which handles debug env vars
  const debugLauncher = new AppDebugLauncher(window);

  // Determine sandbox path
  let cwd = process.cwd();
  if (useSandbox !== false) {
    const sandboxId = targetId || `${path.basename(executablePath)}-${Date.now()}`;
    const sandboxRoot = path.join(app.getPath('userData'), 'cli-sandboxes', sandboxId);
    const sandboxHome = path.join(sandboxRoot, 'home');
    fs.mkdirSync(sandboxHome, { recursive: true });
    cwd = sandboxHome;
  }

  try {
    await debugLauncher.launch({
      executablePath,
      args: [],
      cwd,
      useSandbox: useSandbox !== false,
    });

    // Store capture instance
    setCaptureInstance(targetId, {
      type: 'app-debug',
      instance: debugLauncher,
      pid: debugLauncher.getPid(),
      targetId,
    });

    // Also store in targetProcesses for cleanup
    if (debugLauncher.getPid()) {
      setTargetProcess(targetId, { pid: debugLauncher.getPid() } as any);
    }

    logger.info(`[AppLauncher] Debug mode started for PID ${debugLauncher.getPid()}`);
    
    // Emit target started event
    emitTargetStatusChanged(targetId, 'running', {
      id: targetId,
      title: path.basename(executablePath),
      url: '',
      platform: 'cli',
    });

    return true;
  } catch (error) {
    logger.error('[AppLauncher] Failed to start debug mode:', error);
    return false;
  }
}

/**
 * Stop CLI capture for a target
 */
export function stopCliCapture(targetId: string): void {
  const capture = appState.activeCaptures.get(targetId);
  if (capture) {
    logger.info(`[AppLauncher] Stopping ${capture.type} capture for ${targetId}`);
    removeCaptureInstance(targetId);
  }
}

/**
 * Launch CLI app with CDP-based proxy
 */
export async function launchCliWithCdp(
  executablePath: string,
  targetId: string,
  window: BrowserWindow,
  useSandbox?: boolean,
): Promise<boolean> {
  try {
    logger.info(`[AppLauncher] Launching CLI with CDP Proxy: ${executablePath}`);

    // Start CDP proxy (Chrome + proxy server)
    const cdpProxy = new CdpProxy(window);
    const { proxyPort } = await cdpProxy.start();

    logger.info(`[AppLauncher] CDP proxy started on port ${proxyPort}`);

    // Launch CLI app with HTTP_PROXY pointing to CDP proxy
    const proxyUrl = `http://127.0.0.1:${proxyPort}`;
    const launched = await launchApp(
      executablePath,
      proxyUrl, // CLI will send traffic through CDP proxy
      undefined,
      undefined,
      false, // No env inject needed - proxy handles TLS
      targetId,
      useSandbox,
    );

    if (!launched) {
      cdpProxy.stop();
      throw new Error('Failed to launch CLI application');
    }

    // Store capture instance
    setCaptureInstance(targetId, {
      type: 'cdp',
      instance: cdpProxy,
      targetId,
    });

    logger.info(`[AppLauncher] CLI launched with CDP proxy on port ${proxyPort}`);
    return true;
  } catch (error) {
    logger.error('[AppLauncher] launchCliWithCdp failed:', error);
    if (error instanceof Error) {
      logger.error('[AppLauncher] Error message:', error.message);
      logger.error('[AppLauncher] Error stack:', error.stack);
    }
    throw error;
  }
}
