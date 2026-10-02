/**
 * ------------------------------------------------------------------
 * Frida Injection (port từ src/main/utils/frida/injection.ts)
 * ------------------------------------------------------------------
 * Thay app.getPath('temp') → TMP_DIR.
 * ------------------------------------------------------------------
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ELECTRON_SSL_BYPASS_SCRIPT, SSL_PINNING_BYPASS_SCRIPT } from './scripts';
import { isFridaRunning, startFridaServer } from './manager';
import { TMP_DIR } from '../paths';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Frida');

export async function injectSSLBypass(
  serial: string,
  packageName: string,
  onLog?: (message: string) => void,
): Promise<boolean> {
  try {
    try {
      execSync('which frida', { stdio: 'ignore' });
    } catch {
      onLog?.('ERROR: Frida CLI not installed. Install with: pip install frida-tools');
      return false;
    }

    if (!(await isFridaRunning(serial))) {
      onLog?.('Starting Frida server...');
      const started = await startFridaServer(serial);
      if (!started) {
        onLog?.('ERROR: Failed to start Frida server');
        return false;
      }
    }

    onLog?.(`Injecting SSL bypass into ${packageName}...`);

    const scriptPath = path.join(TMP_DIR, 'ssl-bypass.js');
    fs.writeFileSync(scriptPath, SSL_PINNING_BYPASS_SCRIPT);

    onLog?.('Injecting script (spawn mode)...');

    return new Promise<boolean>((resolve, reject) => {
      const fridaProcess = spawn('frida', ['-U', '-f', packageName, '-l', scriptPath]);

      const timeout = setTimeout(() => {
        onLog?.('⚠️ Process spawn timeout (10s), but continuing...');
        resolve(true);
      }, 10000);

      fridaProcess.stdout.on('data', (data) => {
        const output = data.toString();
        onLog?.(output);
        if (output.includes('Spawned') || output.includes('Resuming main thread')) {
          clearTimeout(timeout);
          resolve(true);
        }
      });

      fridaProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (!output.includes('Frida') && !output.includes('Help')) {
          onLog?.(`STDERR: ${output}`);
        }
      });

      fridaProcess.on('error', (err) => {
        clearTimeout(timeout);
        onLog?.(`ERROR: ${err.message || ''}`);
        logger.error('Frida process error', { err: String(err) });
        reject(err);
      });

      fridaProcess.on('close', () => {});
    });
  } catch (error: any) {
    const msg = error.message || '';
    if (msg.includes("unable to find process with name 'system_server'")) {
      const rootError =
        '❌ FAILURE: Device is NOT rooted. Frida requires ROOT access to spawn apps.\nPlease use a rooted device or emulator (Genymotion/LDPlayer).';
      onLog?.(rootError);
      throw new Error(rootError);
    }

    onLog?.(`ERROR: ${error.message}`);
    logger.error('Failed to inject SSL bypass', { err: String(error) });
    throw error;
  }
}

export async function injectLocalSSLBypass(
  pid: number,
  onLog?: (message: string) => void,
): Promise<boolean> {
  try {
    try {
      execSync('which frida', { stdio: 'ignore' });
    } catch {
      onLog?.('ERROR: Frida CLI not installed. Please install: pip install frida-tools');
      return false;
    }

    onLog?.(`[Frida] ===== STARTING INJECTION FOR PID ${pid} =====`);

    try {
      const cmdlinePath = `/proc/${pid}/cmdline`;
      if (fs.existsSync(cmdlinePath)) {
        const cmdline = fs.readFileSync(cmdlinePath, 'utf8').replace(/\0/g, ' ');
        onLog?.(`[Frida] Process cmdline: ${cmdline}`);
      }

      const exePath = `/proc/${pid}/exe`;
      if (fs.existsSync(exePath)) {
        try {
          const exeLink = fs.readlinkSync(exePath);
          onLog?.(`[Frida] Executable path (readlink): ${exeLink}`);
        } catch (e) {
          onLog?.(`[Frida] Failed to read exe link: ${e}`);
        }
      }

      const cwdPath = `/proc/${pid}/cwd`;
      if (fs.existsSync(cwdPath)) {
        try {
          const cwd = fs.readlinkSync(cwdPath);
          onLog?.(`[Frida] Process cwd: ${cwd}`);
        } catch (e) {
          onLog?.(`[Frida] Failed to read cwd: ${e}`);
        }
      }

      const statusPath = `/proc/${pid}/status`;
      if (fs.existsSync(statusPath)) {
        const status = fs.readFileSync(statusPath, 'utf8');
        const nameMatch = status.match(/Name:\s+(.+)/);
        if (nameMatch) onLog?.(`[Frida] Process name: ${nameMatch[1]}`);
        const ppidMatch = status.match(/PPid:\s+(\d+)/);
        if (ppidMatch) onLog?.(`[Frida] Parent PID: ${ppidMatch[1]}`);
      }

      const environPath = `/proc/${pid}/environ`;
      if (fs.existsSync(environPath)) {
        const environ = fs.readFileSync(environPath, 'utf8').replace(/\0/g, '\n');
        onLog?.(`[Frida] Environment: ${environ}`);
      }
    } catch (e) {
      onLog?.(`[Frida] Failed to get process info: ${e}`);
    }

    onLog?.(`[Frida] Injecting Electron SSL bypass into PID ${pid}...`);

    const scriptPath = path.join(TMP_DIR, 'electron-ssl-bypass.js');
    fs.writeFileSync(scriptPath, ELECTRON_SSL_BYPASS_SCRIPT);

    onLog?.('Attempt 1: Attaching Frida to process (frida -p)...');

    return new Promise<boolean>((resolve) => {
      const fridaProcess = spawn('frida', ['-p', pid.toString(), '-l', scriptPath]);

      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          onLog?.('⚠️ Process attach timeout, aborting injection...');
          resolved = true;
          resolve(false);
        }
      }, 8000);

      const trySpawnMode = () => {
        onLog?.('Attempt 2: Spawning app with Frida (frida -f)...');
        let executablePath = '';
        let executablePathSource = '';

        try {
          const exeLink = `/proc/${pid}/exe`;
          if (fs.existsSync(exeLink)) {
            executablePath = fs.readlinkSync(exeLink);
            executablePathSource = 'readlink';
            onLog?.(`[Frida] Method 1 (readlink): ${executablePath}`);
          }
        } catch (e) {
          onLog?.(`[Frida] Method 1 failed: ${e}`);
        }

        if (
          !executablePath ||
          executablePath === '' ||
          executablePath.includes('/sh') ||
          executablePath.includes('/bash') ||
          executablePath.includes('/dash')
        ) {
          onLog?.(`[Frida] Readlink returned shell, trying cmdline...`);
          try {
            const procPath = `/proc/${pid}/cmdline`;
            if (fs.existsSync(procPath)) {
              const rawCmdline = fs.readFileSync(procPath, 'utf8');
              const parts = rawCmdline.split('\0').filter((s) => s.length > 0);
              onLog?.(`[Frida] Raw cmdline parts: ${JSON.stringify(parts)}`);

              const firstPart = parts[0] || '';
              if (
                firstPart.includes('/sh') ||
                firstPart.includes('/bash') ||
                firstPart.includes('/dash')
              ) {
                onLog?.(`[Frida] First part is shell: ${firstPart}`);
                for (const part of parts) {
                  let cleanPart = part;
                  cleanPart = cleanPart.replace(/\\ /g, ' ');
                  if (cleanPart.endsWith('\\')) {
                    cleanPart = cleanPart.slice(0, -1) + ' ';
                  }
                  onLog?.(`[Frida] Checking part: ${part} -> cleaned: ${cleanPart}`);

                  if (
                    cleanPart.includes('/opt/') ||
                    cleanPart.includes('/usr/') ||
                    cleanPart.includes('/home/') ||
                    cleanPart.includes('/Applications/')
                  ) {
                    executablePath = cleanPart;
                    executablePathSource = 'cmdline_arg';
                    onLog?.(`[Frida] Found executable in args: ${executablePath}`);
                    break;
                  }
                }
                if (!executablePath) {
                  if (parts.length > 1 && parts[1]) {
                    const sPath = parts[1].replace(/\\ /g, ' ');
                    onLog?.(`[Frida] Shell script path: ${sPath}`);
                    if (fs.existsSync(sPath)) {
                      const scriptContent = fs.readFileSync(sPath, 'utf8');
                      const shebangMatch = scriptContent.match(/^#!\s*([^\s]+)/);
                      if (shebangMatch) {
                        executablePath = shebangMatch[1];
                        executablePathSource = 'shebang';
                        onLog?.(`[Frida] Found shebang: ${executablePath}`);
                      }
                    }
                  }
                  if (!executablePath) {
                    executablePath = firstPart.replace(/\\ /g, ' ');
                    executablePathSource = 'cmdline_first';
                    onLog?.(`[Frida] Using first part: ${executablePath}`);
                  }
                }
              } else {
                executablePath = firstPart.replace(/\\ /g, ' ');
                executablePathSource = 'cmdline_first';
                onLog?.(`[Frida] Method 2 (cmdline): ${executablePath}`);
              }
            }
          } catch (e) {
            onLog?.(`[Frida] Method 2 failed: ${e}`);
          }
        }

        if (executablePath) {
          executablePath = executablePath.replace(/\\ /g, ' ').replace(/\\$/g, '');
          executablePath = executablePath.trim();
        }

        onLog?.(
          `[Frida] Final executable path: ${executablePath} (source: ${executablePathSource})`,
        );

        if (
          executablePath &&
          executablePath !== '/bin/sh' &&
          executablePath !== '/bin/bash' &&
          executablePath !== '/bin/dash'
        ) {
          const spawnArgs = ['-f', executablePath, '-l', scriptPath];
          onLog?.(`[Frida] Spawning with: frida ${spawnArgs.join(' ')}`);

          const spawnProcess = spawn('frida', spawnArgs, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env, PATH: process.env.PATH },
          });

          const spawnTimeout = setTimeout(() => {
            if (!resolved) {
              onLog?.('⚠️ Spawn timeout (10s), assuming hooked...');
              resolved = true;
              resolve(true);
            }
          }, 10000);

          spawnProcess.stdout.on('data', (data) => {
            const output = data.toString();
            onLog?.(`[Frida] ${output}`);
            if (output.includes('Spawned') || output.includes('Resuming main thread')) {
              if (!resolved) {
                resolved = true;
                clearTimeout(spawnTimeout);
                onLog?.('✅ App spawned with Frida successfully');
                resolve(true);
              }
            }
          });

          spawnProcess.stderr.on('data', (data) => {
            const output = data.toString();
            if (!output.includes('Frida') && !output.includes('Help')) {
              logger.error(`[Frida Stderr] ${output}`);
              if (output.includes('Cannot spawn')) {
                onLog?.(`❌ Spawn failed: ${output}`);
                if (!resolved) {
                  resolved = true;
                  clearTimeout(spawnTimeout);
                  resolve(false);
                }
              }
            }
          });

          spawnProcess.on('error', (err) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(spawnTimeout);
              onLog?.(`ERROR: ${err.message}`);
              logger.error('Frida spawn error', { err: String(err) });
              resolve(false);
            }
          });

          spawnProcess.unref();
        } else {
          onLog?.('❌ Cannot determine executable path, both attach and spawn failed');
          resolve(false);
        }
      };

      fridaProcess.stdout.on('data', (data) => {
        const output = data.toString();
        onLog?.(`[Frida] ${output}`);
        if (output.includes('Hooked') || output.includes('Hooks verification complete')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            onLog?.('✅ SSL Hook Active (attach mode)');
            resolve(true);
          }
        }
        if (output.includes('Failed to attach: process not found')) {
          onLog?.(`⚠️ Attach failed: process not found, aborting injection...`);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
        }
      });

      fridaProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (
          !output.includes('Frida') &&
          !output.includes('Help') &&
          !output.includes('Attaching')
        ) {
          logger.error(`[Frida Stderr] ${output}`);
          if (output.includes('process not found')) {
            onLog?.(`⚠️ Attach failed: process not found (stderr), aborting injection...`);
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve(false);
            }
          }
        }
      });

      fridaProcess.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          onLog?.(`ERROR: ${err.message}`);
          logger.error('Frida attach error', { err: String(err) });
          onLog?.('⚠️ Attach failed, aborting injection...');
          resolve(false);
        }
      });

      fridaProcess.on('close', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          onLog?.('⚠️ Attach process closed unexpectedly, aborting injection...');
          resolve(false);
        }
      });
    });
  } catch (error: any) {
    onLog?.(`ERROR: ${error.message}`);
    return false;
  }
}

export async function injectCustomScript(
  serial: string,
  packageName: string,
  scriptContent: string,
  onLog?: (message: string) => void,
): Promise<boolean> {
  try {
    if (!(await isFridaRunning(serial))) {
      onLog?.('Starting Frida server...');
      const started = await startFridaServer(serial);
      if (!started) {
        onLog?.('ERROR: Failed to start Frida server');
        return false;
      }
    }

    onLog?.(`Injecting custom script into ${packageName}...`);

    return new Promise<boolean>((resolve) => {
      const scriptPath = path.join(TMP_DIR, `custom-${Date.now()}.js`);
      fs.writeFileSync(scriptPath, scriptContent);

      const fridaProcess = spawn('frida', ['-U', '-f', packageName, '-l', scriptPath]);

      const timeout = setTimeout(() => {
        onLog?.('⚠️ Process spawn timeout (10s), but continuing...');
        resolve(true);
      }, 10000);

      fridaProcess.stdout.on('data', (data) => {
        const output = data.toString();
        onLog?.(output);
        if (output.includes('Spawned') || output.includes('Resuming main thread')) {
          clearTimeout(timeout);
          resolve(true);
        }
      });

      fridaProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (!output.includes('Frida') && !output.includes('Help')) {
          onLog?.(`STDERR: ${output}`);
        }
      });

      fridaProcess.on('error', (err) => {
        clearTimeout(timeout);
        onLog?.(`ERROR: ${err.message || ''}`);
        logger.error('Frida process error', { err: String(err) });
        resolve(false);
      });

      fridaProcess.on('close', () => {});
    });
  } catch (error: any) {
    onLog?.(`ERROR: ${error.message}`);
    logger.error('Failed to inject custom script', { err: String(error) });
    return false;
  }
}