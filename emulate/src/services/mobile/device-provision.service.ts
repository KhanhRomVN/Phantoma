import { execFile } from 'child_process';
import { createLogger, F } from '../../utils/logger.util';
import { armTranslationService } from './arm-translation.service';
import { certInstallService } from './cert-install.service';
import { fridaService } from './frida.service';
import type { ProvisionResult } from '../../types/mobile.type';

const logger = createLogger('Provision');
const BOOT_POLL_MS = 2000;
const BOOT_POLL_TRIES = 60;

function adb(serial: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('adb', ['-s', serial, ...args], { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.toString().trim() || err.message));
      resolve(stdout.toString());
    });
  });
}

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

class DeviceProvisionService {
  private inFlight = new Map<string, Promise<ProvisionResult>>();

  provision(serial: string): Promise<ProvisionResult> {
    const running = this.inFlight.get(serial);
    if (running) return running;
    const task = this.run(serial).finally(() => this.inFlight.delete(serial));
    this.inFlight.set(serial, task);
    return task;
  }

  private async waitBoot(serial: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 5000));
    for (let i = 0; i < BOOT_POLL_TRIES; i++) {
      const booted = await adb(serial, ['shell', 'getprop sys.boot_completed']).catch(() => '');
      if (booted.trim() === '1') return;
      await new Promise((r) => setTimeout(r, BOOT_POLL_MS));
    }
    throw new Error('Device did not finish booting after reboot');
  }

  private async run(serial: string): Promise<ProvisionResult> {
    const result: ProvisionResult = {
      armTranslation: { ok: false },
      cert: { ok: false },
      frida: { ok: false },
    };

    try {
      const arm = await armTranslationService.install(serial);
      result.armTranslation = { ok: true, skipped: !arm.needsReboot };
      if (arm.needsReboot) {
        await adb(serial, ['reboot']).catch(() => '');
        await this.waitBoot(serial);
      }
    } catch (err) {
      result.armTranslation = { ok: false, error: errMsg(err) };
    }

    try {
      const cert = await certInstallService.install(serial);
      result.cert = { ok: cert.installed };
    } catch (err) {
      result.cert = { ok: false, error: errMsg(err) };
    }

    try {
      await fridaService.ensureRunning(serial);
      result.frida = { ok: true };
    } catch (err) {
      result.frida = { ok: false, error: errMsg(err) };
    }

    return result;
  }
}

export const deviceProvisionService = new DeviceProvisionService();
