import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { downloadFridaServer } from './download';

const execAsync = promisify(exec);

/**
 * Check if Frida server is running on emulator
 * Uses multiple detection methods for compatibility with Android 8.0+
 */
export async function isFridaRunning(serial: string): Promise<boolean> {
  try {
    // Method 1: Check for frida-server process using pidof (most reliable on modern Android)
    try {
      const { stdout: pidout } = await execAsync(`adb -s "${serial}" shell "pidof frida-server"`);
      if (pidout.trim()) {
        return true;
      }
    } catch {
      // Continue to next method
    }

    // Method 2: Check if port 27042 (default Frida port) is listening
    try {
      const { stdout: netstat } = await execAsync(
        `adb -s "${serial}" shell "netstat -tulpn 2>/dev/null | grep 27042"`,
      );
      if (netstat.includes('27042')) {
        return true;
      }
    } catch {
      // Continue to next method
    }

    // Method 3: Fallback to ps -A (works on newer Android versions)
    try {
      const { stdout } = await execAsync(`adb -s "${serial}" shell "ps -A | grep frida-server"`);
      return stdout.includes('frida-server');
    } catch {
      // Continue to final fallback
    }

    // Method 4: Final fallback to original ps | grep (for older Android)
    try {
      const { stdout } = await execAsync(`adb -s "${serial}" shell "ps | grep frida-server"`);
      return stdout.includes('frida-server');
    } catch {
      // All methods failed
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check if Frida server is installed on emulator (but potentially not running)
 */
export async function isFridaServerInstalled(serial: string): Promise<boolean> {
  try {
    // Check if the file exists at /data/local/tmp/frida-server
    // ls returns exit code 0 if found, non-zero if not
    await execAsync(`adb -s "${serial}" shell "ls /data/local/tmp/frida-server"`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Install Frida server to emulator
 */
export async function installFridaServer(
  serial: string,
  architecture: string,
  onProgress?: (status: string) => void,
): Promise<boolean> {
  try {
    onProgress?.('Checking Frida server...');

    // Download Frida server if not present
    const serverPath = await downloadFridaServer(architecture, (percent) => {
      onProgress?.(`Downloading Frida server: ${percent}%`);
    });

    onProgress?.('Pushing Frida server to device...');

    // Push to device
    await execAsync(`adb -s "${serial}" push "${serverPath}" /data/local/tmp/frida-server`);

    onProgress?.('Setting permissions...');

    // Make executable
    await execAsync(`adb -s "${serial}" shell "chmod 755 /data/local/tmp/frida-server"`);

    onProgress?.('Frida server installed successfully');
    return true;
  } catch (error) {
    console.error('Failed to install Frida server:', error);
    onProgress?.(`Error: ${error}`);
    return false;
  }
}

/**
 * Start Frida server on emulator
 */
export async function startFridaServer(serial: string): Promise<boolean> {
  try {
    // Check if already running
    if (await isFridaRunning(serial)) {
      return true;
    }

    // Start in background (Try with root first)
    try {
      await execAsync(
        `adb -s "${serial}" shell "su -c '/data/local/tmp/frida-server > /dev/null 2>&1 &'"`,
      );
    } catch (rootError) {
      await execAsync(`adb -s "${serial}" shell "/data/local/tmp/frida-server > /dev/null 2>&1 &"`);
    }

    // Wait a bit for it to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify it's running
    const isRunning = await isFridaRunning(serial);
    if (isRunning) {
    } else {
      console.error('Frida server failed to start');
    }

    return isRunning;
  } catch (error) {
    console.error('Failed to start Frida server:', error);
    return false;
  }
}

/**
 * Stop Frida server on emulator
 */
export async function stopFridaServer(serial: string): Promise<boolean> {
  try {
    await execAsync(`adb -s "${serial}" shell "pkill frida-server"`);
    return true;
  } catch (error) {
    console.error('Failed to stop Frida server:', error);
    return false;
  }
}

/**
 * List running processes on device (for Frida targeting)
 */
export async function listRunningProcesses(serial: string): Promise<
  Array<{
    pid: number;
    name: string;
  }>
> {
  try {
    const { stdout } = await execAsync(`adb -s "${serial}" shell "ps"`);
    const lines = stdout.trim().split('\n');
    const processes: Array<{ pid: number; name: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length >= 9) {
        const pid = parseInt(parts[1], 10);
        const name = parts[parts.length - 1];
        if (pid && name) {
          processes.push({ pid, name });
        }
      }
    }

    return processes;
  } catch (error) {
    console.error('Failed to list processes:', error);
    return [];
  }
}

/**
 * Ensure ptrace_scope is set to 0 to allow attaching to processes
 * Returns true if successful or already 0
 */
export async function ensurePtraceScope(onLog?: (msg: string) => void): Promise<boolean> {
  try {
    const ptracePath = '/proc/sys/kernel/yama/ptrace_scope';
    if (!fs.existsSync(ptracePath)) {
      return true; // Not present on all builds, assume safe
    }

    const content = fs.readFileSync(ptracePath, 'utf8').trim();
    if (content === '0') {
      return true;
    }

    onLog?.('⚠️ ptrace_scope is restricted. Requesting permission to change...');

    // Use pkexec to get root permission GUI prompt
    try {
      await execAsync(`pkexec sh -c "echo 0 > ${ptracePath}"`);
      onLog?.('✅ Permission granted. ptrace_scope set to 0.');
      return true;
    } catch (err) {
      onLog?.('❌ Failed to change ptrace_scope. Root permission denied/cancelled.');
      return false;
    }
  } catch (e: any) {
    onLog?.(`Error checking ptrace_scope: ${e.message}`);
    return false;
  }
}