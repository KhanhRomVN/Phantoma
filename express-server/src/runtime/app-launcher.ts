/**
 * ------------------------------------------------------------------
 * App Launcher (port từ src/main/app-launcher.ts)
 * ------------------------------------------------------------------
 * Thay điểm chạm Electron:
 *  - app.getPath('userData')  → PROFILES_DIR / SANDBOX_DIR / RUNTIME_DIR
 *  - BrowserWindow.getAllWindows() + webContents.send('app:process-exit')
 *      → runtimeBus.emitEvent('app:process-exit', ...)
 *  - cdpManager.setMainWindow(win) → bỏ (không còn window)
 * ------------------------------------------------------------------
 */

import { spawn, execSync as execSyncChild } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { cdpManager } from './cdp/cdp-manager';
import { findAvailablePort } from './net';
import { appState, setTargetProcess, removeTargetProcess, setCaptureInstance, removeCaptureInstance } from './state';
import { injectLocalSSLBypass } from './frida';
import { emitTargetStatusChanged } from './target-metadata';
import { runtimeBus } from './event-bus';
import { PROFILES_DIR, SANDBOX_DIR, RUNTIME_DIR } from './paths';
import { createLogger } from '../utils/logger';

const logger = createLogger('AppLauncher');

export let launchCdpPort: number | null = null;

function launchBrowser(
  url: string,
  profileName: string,
  proxyUrl: string,
  cdpPort?: number,
  targetId?: string,
): boolean {
  const useProxy = !cdpPort;
  if (useProxy) {
    appState.activeProxyUrl = proxyUrl;
  }

  const userDataDir = path.join(PROFILES_DIR, profileName);
  fs.mkdirSync(userDataDir, { recursive: true });

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
      logger.warn(`Browser not found: ${b}`);
      continue;
    }
  }

  if (!executable) {
    logger.error('No browser executable found! Tried:', { browsers });
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

  if (useProxy) {
    args.push(`--proxy-server=${proxyUrl}`);
  }

  if (cdpPort) {
    args.push(`--remote-debugging-port=${cdpPort}`);
  }

  const child = spawn(executable, args, {
    detached: true,
    stdio: 'ignore',
  });

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
      runtimeBus.emitEvent('app:process-exit', profileName);
    }
    if (targetId) {
      removeTargetProcess(targetId);
      emitTargetStatusChanged(targetId, 'stopped');
    }
  });

  child.on('error', (err) => {
    logger.error('Browser process error', { err: String(err) });
  });

  child.unref();

  if (targetId) {
    emitTargetStatusChanged(targetId, 'running', {
      id: targetId,
      title: profileName,
      url,
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
  targetId?: string,
  useSandbox?: boolean,
  captureMode?: 'proxy' | 'ebpf' | 'packet',
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
        runtimeBus.emitEvent('app:process-exit', appName);
      }
    });

    child.unref();

    setTimeout(async () => {
      try {
        await cdpManager.connect(debugPort);
      } catch {
        logger.warn('CDP connection failed silently');
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
            logger.warn('Failed to find child processes');
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

  if (appName === '__all_websites__') {
    const cdpPort = forceMode === 'cdp' ? await findAvailablePort(9222) : undefined;
    if (cdpPort) {
      launchCdpPort = cdpPort;
    }
    const result = launchBrowser('https://google.com', appName, proxyUrl, cdpPort, targetId);

    if (forceMode === 'cdp' && result && cdpPort) {
      setTimeout(async () => {
        try {
          await cdpManager.connect(cdpPort);
        } catch (err) {
          logger.error('CDP connection failed', { err: String(err) });
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
          await cdpManager.connect(cdpPort);
        } catch (err) {
          logger.error('CDP connection failed', { err: String(err) });
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

  const isFullPath = appName.includes('/');
  let executablePath = appName;
  let executableName = appName;

  if (isFullPath) {
    executablePath = appName.replace(/\\ /g, ' ');
    if (!fs.existsSync(executablePath)) {
      logger.error(`Executable not found: ${executablePath}`);
      return false;
    }
    executableName = path.basename(executablePath);
  } else {
    try {
      const allPaths = execSyncChild(`which -a ${appName} 2>/dev/null || which ${appName}`, {
        encoding: 'utf8',
      }).trim();

      const paths = allPaths.split('\n').filter((p) => p.length > 0);
      const globalPath = paths.find((p) => !p.includes('node_modules'));
      executablePath = globalPath || paths[0] || '';

      if (!executablePath) {
        logger.error(`Command not found in PATH: ${appName}`);
        return false;
      }

      if (globalPath) {
        logger.info(`Using global installation: ${executablePath}`);
      } else {
        logger.warn(`Using local installation (no global found): ${executablePath}`);
      }

      executableName = appName;
    } catch {
      logger.error(`Command not found in PATH: ${appName}`);
      return false;
    }
  }

  const shouldUseSandbox = useSandbox !== false;

  let sandboxRoot: string;
  let sandboxHome: string;
  let sandboxConfig: string;
  let sandboxCache: string;
  let sandboxData: string;
  let sandboxTemp: string;
  let env: Record<string, string>;

  if (shouldUseSandbox) {
    const sandboxId = targetId || `${executableName}-${Date.now()}`;
    sandboxRoot = path.join(SANDBOX_DIR, sandboxId);
    sandboxHome = path.join(sandboxRoot, 'home');
    sandboxConfig = path.join(sandboxRoot, 'config');
    sandboxCache = path.join(sandboxRoot, 'cache');
    sandboxData = path.join(sandboxRoot, 'data');
    sandboxTemp = path.join(sandboxRoot, 'tmp');

    fs.mkdirSync(sandboxHome, { recursive: true });
    fs.mkdirSync(sandboxConfig, { recursive: true });
    fs.mkdirSync(sandboxCache, { recursive: true });
    fs.mkdirSync(sandboxData, { recursive: true });
    fs.mkdirSync(sandboxTemp, { recursive: true });

    logger.info(`Created CLI sandbox for ${executableName} at: ${sandboxRoot}`);

    env = {
      HOME: sandboxHome,
      USERPROFILE: sandboxHome,
      XDG_CONFIG_HOME: sandboxConfig,
      XDG_CACHE_HOME: sandboxCache,
      XDG_DATA_HOME: sandboxData,
      XDG_STATE_HOME: path.join(sandboxData, 'state'),
      XDG_RUNTIME_DIR: sandboxTemp,
      TMPDIR: sandboxTemp,
      TEMP: sandboxTemp,
      TMP: sandboxTemp,
      PATH: process.env.PATH || '',
      LANG: process.env.LANG || 'en_US.UTF-8',
      TERM: process.env.TERM || 'xterm-256color',
      SHELL: process.env.SHELL || '/bin/bash',
      DISPLAY: process.env.DISPLAY || ':0',
      WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || '',
      USER: 'phantoma-sandbox',
      LOGNAME: 'phantoma-sandbox',
    };
  } else {
    logger.info(`Launching ${executableName} without sandbox (system environment)`);

    sandboxRoot = '';
    sandboxHome = process.env.HOME || process.cwd();
    sandboxConfig = '';
    sandboxCache = '';
    sandboxData = '';
    sandboxTemp = process.env.TMPDIR || process.env.TEMP || '/tmp';

    env = { ...process.env } as Record<string, string>;
  }

  const skipProxyEnv = captureMode === 'ebpf' || captureMode === 'packet';
  if (proxyUrl && !skipProxyEnv) {
    env.http_proxy = proxyUrl;
    env.https_proxy = proxyUrl;
    env.HTTP_PROXY = proxyUrl;
    env.HTTPS_PROXY = proxyUrl;
    env.all_proxy = proxyUrl;
    env.ALL_PROXY = proxyUrl;

    const noProxyList = ['localhost', '127.0.0.1'].join(',');
    env.NO_PROXY = noProxyList;
    env.no_proxy = noProxyList;

    if (useEnvInject) {
      env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      env.NODE_EXTRA_CA_CERTS = '/usr/local/share/ca-certificates/phantoma.crt';
    }
  } else if (skipProxyEnv) {
    for (const key of [
      'http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY',
      'all_proxy', 'ALL_PROXY', 'no_proxy', 'NO_PROXY',
      'NODE_TLS_REJECT_UNAUTHORIZED', 'NODE_EXTRA_CA_CERTS',
    ]) {
      delete env[key];
    }
    logger.info(`captureMode=${captureMode}: proxy env scrubbed, target will connect directly`);
  }

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

  for (const term of terminalEmulators) {
    try {
      execSyncChild(`which ${term.cmd}`, { encoding: 'utf8' });
      terminal = term;
      logger.info(`Found terminal emulator: ${term.cmd}`);
      break;
    } catch {
      continue;
    }
  }

  if (!terminal) {
    logger.error('No terminal emulator found! Install gnome-terminal, konsole, or xterm');
    return false;
  }

  const wrapperScript = path.join(sandboxTemp, 'launch.sh');

  const pidFile = path.join(SANDBOX_DIR, targetId || 'default', 'target.pid');
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  try {
    fs.unlinkSync(pidFile);
  } catch {
    // pidfile did not exist
  }

  let envVars: string;
  if (shouldUseSandbox) {
    envVars = Object.entries(env)
      .map(([key, value]) => `export ${key}="${value.replace(/"/g, '\\"')}"`)
      .join('\n');
  } else {
    const proxyVars = [
      'http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY',
      'all_proxy', 'ALL_PROXY', 'NO_PROXY', 'no_proxy',
      'NODE_TLS_REJECT_UNAUTHORIZED', 'NODE_EXTRA_CA_CERTS',
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

echo "Checking executable info..."
which ${executableName}
${executableName} --version 2>/dev/null || echo "No version flag"
echo ""

${envVars}

${shouldUseSandbox ? `cd "${sandboxHome}"` : 'cd "$HOME"'}

echo "Working directory: \$(pwd)"
echo ""

trap 'echo ""; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; echo "Process exited. Press any key to close..."; read -n 1' EXIT

echo $$ > "${pidFile}"
exec "${executablePath}"
`;

  fs.writeFileSync(wrapperScript, scriptContent, { mode: 0o755 });

  logger.info(`Created wrapper script at: ${wrapperScript}`);
  logger.info(`Executable path: ${executablePath}`);
  logger.info(`Working directory: ${sandboxHome}`);
  logger.info(`Sandbox mode: ${shouldUseSandbox}`);

  const terminalArgs =
    terminal.cmd === 'gnome-terminal'
      ? ['--wait', '--', wrapperScript]
      : [...terminal.args, wrapperScript];

  const child = spawn(terminal.cmd, terminalArgs, {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  appState.activeChildProcess = child;
  if (targetId) {
    setTargetProcess(targetId, child);
  }

  if (child.stdout) {
    child.stdout.on('data', (data) => {
      logger.debug(`${executableName} stdout: ${data.toString().trim()}`);
    });
  }
  if (child.stderr) {
    child.stderr.on('data', (data) => {
      logger.debug(`${executableName} stderr: ${data.toString().trim()}`);
    });
  }

  child.on('exit', (code) => {
    logger.info(`Terminal exited with code: ${code}`);
    if (appState.activeChildProcess === child) {
      appState.activeChildProcess = null;
      appState.activeProxyUrl = null;
      runtimeBus.emitEvent('app:process-exit', appName);
    }
    if (targetId) {
      removeTargetProcess(targetId);
      emitTargetStatusChanged(targetId, 'stopped');
    }
  });

  child.on('error', (err) => {
    logger.error('Terminal error', { err: String(err) });
  });

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
          logger.warn('Failed to find child processes');
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

export async function launchCliWithEbpf(
  executablePath: string,
  targetId: string,
  _window?: unknown,
  useSandbox?: boolean,
): Promise<boolean> {
  try {
    logger.info(`Launching CLI with eBPF: ${executablePath}`);

    const launched = await launchApp(
      executablePath,
      '',
      undefined,
      undefined,
      false,
      targetId,
      useSandbox,
      'ebpf',
    );

    if (!launched) {
      logger.error('Failed to launch app for eBPF capture');
      throw new Error('Failed to launch application');
    }

    const terminalProcess = appState.targetProcesses.get(targetId);
    if (!terminalProcess || !terminalProcess.pid) {
      logger.error('Terminal process not found');
      throw new Error('Terminal process not found after launch');
    }

    const terminalPid = terminalProcess.pid;
    logger.info(`Terminal PID: ${terminalPid}`);

    logger.info(`Waiting for ${path.basename(executablePath)} process to spawn...`);

    let actualPid: number | null = null;
    const maxAttempts = 15;
    const execName = path.basename(executablePath);

    const pidFile = path.join(SANDBOX_DIR, targetId || 'default', 'target.pid');
    logger.info(`Polling pidfile: ${pidFile}`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        if (fs.existsSync(pidFile)) {
          const raw = fs.readFileSync(pidFile, 'utf8').trim();
          const pid = parseInt(raw, 10);
          if (!isNaN(pid) && pid > 1 && fs.existsSync(`/proc/${pid}`)) {
            actualPid = pid;
            logger.info(`Found target PID ${pid} from ${pidFile}`);
            break;
          }
        }
        logger.info(`Attempt ${attempt + 1}/${maxAttempts}: ${execName} pidfile not ready yet, waiting...`);
      } catch (error) {
        logger.warn('Error reading pidfile', { err: String(error) });
      }
    }

    if (!actualPid) {
      logger.error('Could not find actual CLI process after waiting');
      throw new Error(`Could not find ${path.basename(executablePath)} process`);
    }

    const ebpfCapture = new EbpfCapture();
    await ebpfCapture.start({ targetPid: actualPid });

    setCaptureInstance(targetId, {
      type: 'ebpf',
      instance: ebpfCapture,
      pid: actualPid,
      targetId,
    });

    logger.info(`eBPF capture started for ${path.basename(executablePath)} PID ${actualPid}`);
    return true;
  } catch (error) {
    logger.error('launchCliWithEbpf failed', { err: String(error) });
    throw error;
  }
}

export async function launchCliWithPacketCapture(
  executablePath: string,
  targetId: string,
  _window?: unknown,
  useSandbox?: boolean,
): Promise<boolean> {
  logger.info(`Launching CLI with Packet Capture: ${executablePath}`);

  const packetCapture = new PacketCapture();

  try {
    await packetCapture.start({
      filter: 'tcp port 443',
      interface: 'any',
    });
    logger.info('Packet capture started');
  } catch (error) {
    logger.error('Failed to start packet capture', { err: String(error) });
    return false;
  }

  const launched = await launchApp(executablePath, '', undefined, undefined, false, targetId, useSandbox);

  if (!launched) {
    packetCapture.stop();
    return false;
  }

  setCaptureInstance(targetId, {
    type: 'pcap',
    instance: packetCapture,
    targetId,
  });

  return true;
}

export async function launchCliWithDebugMode(
  executablePath: string,
  targetId: string,
  _window?: unknown,
  useSandbox?: boolean,
): Promise<boolean> {
  logger.info(`Launching CLI with Debug Mode: ${executablePath}`);

  const debugLauncher = new AppDebugLauncher();

  let cwd = process.cwd();
  if (useSandbox !== false) {
    const sandboxId = targetId || `${path.basename(executablePath)}-${Date.now()}`;
    const sandboxHome = path.join(SANDBOX_DIR, sandboxId, 'home');
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

    setCaptureInstance(targetId, {
      type: 'app-debug',
      instance: debugLauncher,
      pid: debugLauncher.getPid(),
      targetId,
    });

    if (debugLauncher.getPid()) {
      setTargetProcess(targetId, { pid: debugLauncher.getPid() } as any);
    }

    logger.info(`Debug mode started for PID ${debugLauncher.getPid()}`);

    emitTargetStatusChanged(targetId, 'running', {
      id: targetId,
      title: path.basename(executablePath),
      url: '',
      platform: 'cli',
    });

    return true;
  } catch (error) {
    logger.error('Failed to start debug mode', { err: String(error) });
    return false;
  }
}

export function stopCliCapture(targetId: string): void {
  const capture = appState.activeCaptures.get(targetId);
  if (capture) {
    logger.info(`Stopping ${capture.type} capture for ${targetId}`);
    removeCaptureInstance(targetId);
  }
}

export async function launchCliWithCdp(
  executablePath: string,
  targetId: string,
  _window?: unknown,
  useSandbox?: boolean,
): Promise<boolean> {
  try {
    logger.info(`Launching CLI with CDP Proxy: ${executablePath}`);

    const cdpProxy = new CdpProxy();
    const { proxyPort } = await cdpProxy.start();

    logger.info(`CDP proxy started on port ${proxyPort}`);

    const proxyUrl = `http://127.0.0.1:${proxyPort}`;
    const launched = await launchApp(
      executablePath,
      proxyUrl,
      undefined,
      undefined,
      false,
      targetId,
      useSandbox,
    );

    if (!launched) {
      cdpProxy.stop();
      throw new Error('Failed to launch CLI application');
    }

    setCaptureInstance(targetId, {
      type: 'cdp',
      instance: cdpProxy,
      targetId,
    });

    logger.info(`CLI launched with CDP proxy on port ${proxyPort}`);
    return true;
  } catch (error) {
    logger.error('launchCliWithCdp failed', { err: String(error) });
    throw error;
  }
}