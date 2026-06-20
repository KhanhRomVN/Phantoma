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

    onLog?.(`Injecting Electron SSL bypass into PID ${pid}...`);

    // Save script to temp file
    const scriptPath = path.join(app.getPath('temp'), 'electron-ssl-bypass.js');
    fs.writeFileSync(scriptPath, ELECTRON_SSL_BYPASS_SCRIPT);

    onLog?.('Attaching Frida to process...');

    return new Promise<boolean>((resolve) => {
      // -p: pid, -l: load script
      const fridaProcess = spawn('frida', ['-p', pid.toString(), '-l', scriptPath]);

      const timeout = setTimeout(() => {
        onLog?.('⚠️ Process attach timeout (5s), assuming hooked...');
        resolve(true);
      }, 5000);

      fridaProcess.stdout.on('data', (data) => {
        const output = data.toString();
        onLog?.(`[Frida] ${output}`);
        if (output.includes('Hooked') || output.includes('Hooks verification complete')) {
          onLog?.('✅ SSL Hook Active');
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
        }
      });

      fridaProcess.on('error', (err) => {
        clearTimeout(timeout);
        onLog?.(`ERROR: ${err.message}`);
        console.error('Frida attach error:', err);
        resolve(false);
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