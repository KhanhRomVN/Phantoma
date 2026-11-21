import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createLogger, F } from '../../utils/logger.util';
import type { ArmTranslationStatus } from '../../types/mobile.type';

const logger = createLogger('ArmTranslation');
const ADB_TIMEOUT_MS = 120000;
// ASSUMED: assets/ nằm cạnh dist/ (build) và cạnh src/ (dev)
const ZIP_PATH = path.join(__dirname, '..', '..', 'assets', 'Genymotion-ARM-Translation_for_9.0.zip');

function exec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: ADB_TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.toString().trim() || err.message));
      resolve(stdout.toString());
    });
  });
}

class ArmTranslationService {
  private async connect(serial: string): Promise<void> {
    if (serial.includes(':')) await exec('adb', ['connect', serial]).catch(() => '');
  }

  async status(serial: string): Promise<ArmTranslationStatus> {
    await this.connect(serial);
    const hasBinary = await exec('adb', ['-s', serial, 'shell', 'ls /system/bin/houdini'])
      .then(() => true)
      .catch(() => false);
    const abis = (await exec('adb', ['-s', serial, 'shell', 'getprop ro.product.cpu.abilist']).catch(() => '')).trim();
    return { installed: hasBinary && abis.includes('armeabi'), zipAvailable: fs.existsSync(ZIP_PATH) };
  }

  async install(serial: string): Promise<{ installed: boolean; needsReboot: boolean }> {
    if (!fs.existsSync(ZIP_PATH)) throw new Error(`ARM translation zip not found: ${ZIP_PATH}`);
    await this.connect(serial);

    const current = await this.status(serial);
    if (current.installed) return { installed: true, needsReboot: false };

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arm-translation-'));
    try {
      await exec('unzip', ['-oq', ZIP_PATH, '-d', tmp]);
      await exec('adb', ['-s', serial, 'root']).catch(() => '');
      await exec('adb', ['-s', serial, 'wait-for-device']);
      await exec('adb', ['-s', serial, 'remount']).catch(() => '');
      await exec('adb', ['-s', serial, 'push', `${tmp}/system/.`, '/system/']);
      await exec('adb', ['-s', serial, 'shell', 'chmod 755 /system/bin/houdini && chmod -R 755 /system/lib/arm']);
      logger.info('ARM translation pushed', F('serial', serial));
      return { installed: true, needsReboot: true };
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
}

export const armTranslationService = new ArmTranslationService();