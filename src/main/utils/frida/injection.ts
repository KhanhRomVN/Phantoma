import { exec, execSync, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ELECTRON_SSL_BYPASS_SCRIPT, SSL_PINNING_BYPASS_SCRIPT } from './scripts';
import { isFridaRunning, startFridaServer } from './manager';

const execAsync = promisify(exec);

/**
 * Inject SSL pinning bypass into app
 */
export async function injectSSLBypass(
  serial: string,
  packageName: string,
  onLog?: (message: string) => void,
): Promise<boolean> {
  try {
    // Check if Frida tools are available
    try {
      execSync('which frida', { stdio: 'ignore' });
    } catch {
      onLog?.('ERROR: Frida CLI not installed. Install with: pip install frida-tools');
      return false;
    }

    // Ensure Frida server is running
    if (!(await isFridaRunning(serial))) {
      onLog?.('Starting Frida server...');
      const started = await startFridaServer(serial);
      if (!started) {
        onLog?.('ERROR: Failed to start Frida server');
        return false;
      }
    }

    onLog?.(`Injecting SSL bypass into ${packageName}...`);

    // Save script to temp file
    const scriptPath = path.join(app.getPath('temp'), 'ssl-bypass.js');
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

        // Check for success markers
        if (output.includes('Spawned') || output.includes('Resuming main thread')) {
          clearTimeout(timeout);
          resolve(true);
        }
      });

      fridaProcess.stderr.on('data', (data) => {
        const output = data.toString();
        // Ignore header/helper messages if they appear in stderr
        if (!output.includes('Frida') && !output.includes('Help')) {
          onLog?.(`STDERR: ${output}`);
        }
      });

      fridaProcess.on('error', (err) => {
        clearTimeout(timeout);
        const msg = err.message || '';
        onLog?.(`ERROR: ${msg}`);
        console.error('Frida process error:', err);
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
    console.error('Failed to inject SSL bypass:', error);
    throw error;
  }
}

/**
 * Inject SSL bypass into a local process (Linux/Electron)
 */
export async function injectLocalSSLBypass(
  pid: number,
  onLog?: (message: string) => void,
): Promise<boolean> {
  try {
    // Check if Frida tools are available
    try {
      execSync('which frida', { stdio: 'ignore' });
    } catch {
      onLog?.('ERROR: Frida CLI not installed. Please install: pip install frida-tools');
      return false;
    }

    onLog?.(`[Frida] ===== STARTING INJECTION FOR PID ${pid} =====`);

    // Get detailed process information
    try {
      // Get process command line
      const cmdlinePath = `/proc/${pid}/cmdline`;
      if (fs.existsSync(cmdlinePath)) {
        const cmdline = fs.readFileSync(cmdlinePath, 'utf8').replace(/\0/g, ' ');
        onLog?.(`[Frida] Process cmdline: ${cmdline}`);
      }
      
      // Get executable path
      const exePath = `/proc/${pid}/exe`;
      if (fs.existsSync(exePath)) {
        try {
          const exeLink = fs.readlinkSync(exePath);
          onLog?.(`[Frida] Executable path (readlink): ${exeLink}`);
        } catch (e) {
          onLog?.(`[Frida] Failed to read exe link: ${e}`);
        }
      }
      
      // Get process cwd
      const cwdPath = `/proc/${pid}/cwd`;
      if (fs.existsSync(cwdPath)) {
        try {
          const cwd = fs.readlinkSync(cwdPath);
          onLog?.(`[Frida] Process cwd: ${cwd}`);
        } catch (e) {
          onLog?.(`[Frida] Failed to read cwd: ${e}`);
        }
      }
      
      // Get process status
      const statusPath = `/proc/${pid}/status`;
      if (fs.existsSync(statusPath)) {
        const status = fs.readFileSync(statusPath, 'utf8');
        const nameMatch = status.match(/Name:\s+(.+)/);
        if (nameMatch) {
          onLog?.(`[Frida] Process name: ${nameMatch[1]}`);
        }
        const ppidMatch = status.match(/PPid:\s+(\d+)/);
        if (ppidMatch) {
          onLog?.(`[Frida] Parent PID: ${ppidMatch[1]}`);
        }
      }
      
      // Get process arguments from /proc/pid/environ if available
      const environPath = `/proc/${pid}/environ`;
      if (fs.existsSync(environPath)) {
        const environ = fs.readFileSync(environPath, 'utf8').replace(/\0/g, '\n');
        onLog?.(`[Frida] Environment: ${environ}`);
      }
    } catch (e) {
      onLog?.(`[Frida] Failed to get process info: ${e}`);
    }

    onLog?.(`[Frida] Injecting Electron SSL bypass into PID ${pid}...`);

    // Save script to temp file
    const scriptPath = path.join(app.getPath('temp'), 'electron-ssl-bypass.js');
    fs.writeFileSync(scriptPath, ELECTRON_SSL_BYPASS_SCRIPT);

    onLog?.('Attempt 1: Attaching Frida to process (frida -p)...');

    return new Promise<boolean>((resolve) => {
      // Try attach mode first: -p: pid, -l: load script
      const fridaProcess = spawn('frida', ['-p', pid.toString(), '-l', scriptPath]);

      let attachFailed = false;
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
        // Try to get executable path from /proc with multiple methods
        let executablePath = '';
        let executablePathSource = '';
        
        // Method 1: readlink /proc/<pid>/exe (gives actual executable)
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

        // Method 2: fallback to cmdline if readlink failed or returned shell
        if (!executablePath || executablePath === '' || 
            executablePath.includes('/sh') || executablePath.includes('/bash') ||
            executablePath.includes('/dash')) {
          onLog?.(`[Frida] Readlink returned shell, trying cmdline...`);
          try {
            const procPath = `/proc/${pid}/cmdline`;
            if (fs.existsSync(procPath)) {
              // Read cmdline and split by null bytes (each argument is null-terminated)
              const rawCmdline = fs.readFileSync(procPath, 'utf8');
              const parts = rawCmdline.split('\0').filter(s => s.length > 0);
              onLog?.(`[Frida] Raw cmdline parts: ${JSON.stringify(parts)}`);
              
              // Skip if it's /bin/sh or /bin/bash
              const firstPart = parts[0] || '';
              if (firstPart.includes('/sh') || firstPart.includes('/bash') || firstPart.includes('/dash')) {
                onLog?.(`[Frida] First part is shell: ${firstPart}`);
                // Try to get the real executable from command line arguments
                for (const part of parts) {
                  // Look for actual executable paths (remove any trailing backslash escapes)
                  let cleanPart = part;
                  // Handle escaped spaces: replace backslash+space with actual space
                  // The shell uses backslash to escape spaces, but in /proc it appears as literal backslash
                  cleanPart = cleanPart.replace(/\\ /g, ' ');
                  // Remove trailing backslash if it's escaping a space at the end
                  if (cleanPart.endsWith('\\')) {
                    cleanPart = cleanPart.slice(0, -1) + ' ';
                  }
                  onLog?.(`[Frida] Checking part: ${part} -> cleaned: ${cleanPart}`);
                  
                  if (cleanPart.includes('/opt/') || cleanPart.includes('/usr/') || 
                      cleanPart.includes('/home/') || cleanPart.includes('/Applications/')) {
                    executablePath = cleanPart;
                    executablePathSource = 'cmdline_arg';
                    onLog?.(`[Frida] Found executable in args: ${executablePath}`);
                    break;
                  }
                }
                if (!executablePath) {
                  // If the shell is running a script, the script path might be the first arg after shell
                  if (parts.length > 1 && parts[1]) {
                    const scriptPath = parts[1].replace(/\\ /g, ' ');
                    onLog?.(`[Frida] Shell script path: ${scriptPath}`);
                    // Try to find the actual binary from the script's shebang or by reading the script
                    if (fs.existsSync(scriptPath)) {
                      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
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

        // Final cleanup: remove any trailing backslashes and ensure proper path
        if (executablePath) {
          executablePath = executablePath.replace(/\\ /g, ' ').replace(/\\$/g, '');
          // If the path has a trailing space, trim it
          executablePath = executablePath.trim();
        }

        onLog?.(`[Frida] Final executable path: ${executablePath} (source: ${executablePathSource})`);

        if (executablePath && executablePath !== '/bin/sh' && executablePath !== '/bin/bash' && executablePath !== '/bin/dash') {
          // Use spawn mode: frida -f <executable> -l script.js (without --enable-api)
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
              console.error(`[Frida Stderr] ${output}`);
              // If spawn fails, maybe the executable path is wrong
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
              console.error('Frida spawn error:', err);
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
        // Check if attach failed due to process not found
        if (output.includes('Failed to attach: process not found')) {
          attachFailed = true;
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
          console.error(`[Frida Stderr] ${output}`);
          // Check if stderr contains process not found
          if (output.includes('process not found')) {
            attachFailed = true;
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
          console.error('Frida attach error:', err);
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

/**
 * Inject custom Frida script into app
 */
export async function injectCustomScript(
  serial: string,
  packageName: string,
  scriptContent: string,
  onLog?: (message: string) => void,
): Promise<boolean> {
  try {
    // Ensure Frida server is running
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
      // Save script to temp file
      const scriptPath = path.join(app.getPath('temp'), `custom-${Date.now()}.js`);
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
        const msg = err.message || '';
        onLog?.(`ERROR: ${msg}`);
        console.error('Frida process error:', err);
        resolve(false);
      });

      fridaProcess.on('close', () => {});
    });
  } catch (error: any) {
    onLog?.(`ERROR: ${error.message}`);
    console.error('Failed to inject custom script:', error);
    return false;
  }
}