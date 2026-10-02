/**
 * ------------------------------------------------------------------
 * Frida Manager (port từ src/main/utils/frida/manager.ts)
 * ------------------------------------------------------------------
 * Giữ nguyên logic; đổi import logger.
 * ------------------------------------------------------------------
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { downloadFridaServer } from './download';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Frida');
const execAsync = promisify(exec);

export async function isFridaRunning(serial: string): Promise<boolean> {
  try {
    try {
      const { stdout: pidout } = await execAsync(`adb -s "${serial}" shell "pidof frida-server"`);
      if (pidout.trim()) return true;
    } catch {
      logger.warn('pidof method failed, trying netstat');
    }

    try {
      const { stdout: netstat } = await execAsync(
        `adb -s "${serial}" shell "netstat -tulpn 2>/dev/null | grep 27042"`,
      );
      if (netstat.includes('27042')) return true;
    } catch {
      logger.warn('netstat method failed, trying ps -A');
    }

    try {
      const { stdout } = await execAsync(`adb -s "${serial}" shell "ps -A | grep frida-server"`);
      return stdout.includes('frida-server');
    } catch {
      logger.warn('ps -A method failed, trying ps');
    }

    try {
      const { stdout } = await execAsync(`adb -s "${serial}" shell "ps | grep frida-server"`);
      return stdout.includes('frida-server');
    } catch {
      logger.warn('All detection methods failed');
    }

    return false;
  } catch {
    logger.warn('Failed to check if Frida is running');
    return false;
  }
}

export async function isFridaServerInstalled(serial: string): Promise<boolean> {
  try {
    await execAsync(`adb -s "${serial}" shell "ls /data/local/tmp/frida-server"`);
    return true;
  } catch {
    logger.warn('Frida server not installed');
    return false;
  }
}

export async function installFridaServer(
  serial: string,
  architecture: string,
  onProgress?: (status: string) => void,
): Promise<boolean> {
  try {
    onProgress?.('Checking Frida server...');
    const serverPath = await downloadFridaServer(architecture, (percent) => {
      onProgress?.(`Downloading Frida server: ${percent}%`);
    });

    onProgress?.('Pushing Frida server to device...');
    await execAsync(`adb -s "${serial}" push "${serverPath}" /data/local/tmp/frida-server`);

    onProgress?.('Setting permissions...');
    await execAsync(`adb -s "${serial}" shell "chmod 755 /data/local/tmp/frida-server"`);

    onProgress?.('Frida server installed successfully');
    return true;
  } catch (error) {
    logger.error('Failed to install Frida server', { err: String(error) });
    onProgress?.(`Error: ${error}`);
    return false;
  }
}

export async function startFridaServer(serial: string): Promise<boolean> {
  try {
    if (await isFridaRunning(serial)) return true;

    try {
      await execAsync(
        `adb -s "${serial}" shell "su -c '/data/local/tmp/frida-server > /dev/null 2>&1 &'"`,
      );
    } catch {
      logger.warn('Root start failed, trying without root');
      await execAsync(`adb -s "${serial}" shell "/data/local/tmp/frida-server > /dev/null 2>&1 &"`);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const isRunning = await isFridaRunning(serial);
    if (!isRunning) logger.error('Frida server failed to start');
    return isRunning;
  } catch (error) {
    logger.error('Failed to start Frida server', { err: String(error) });
    return false;
  }
}

export async function stopFridaServer(serial: string): Promise<boolean> {
  try {
    await execAsync(`adb -s "${serial}" shell "pkill frida-server"`);
    return true;
  } catch (error) {
    logger.error('Failed to stop Frida server', { err: String(error) });
    return false;
  }
}

export async function listRunningProcesses(
  serial: string,
): Promise<Array<{ pid: number; name: string }>> {
  try {
    const { stdout } = await execAsync(`adb -s "${serial}" shell "ps"`);
    const lines = stdout.trim().split('\n');
    const processes: Array<{ pid: number; name: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length >= 9) {
        const pid = parseInt(parts[1], 10);
        const name = parts[parts.length - 1];
        if (pid && name) processes.push({ pid, name });
      }
    }

    return processes;
  } catch (error) {
    logger.error('Failed to list processes', { err: String(error) });
    return [];
  }
}