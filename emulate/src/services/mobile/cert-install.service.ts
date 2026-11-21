import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CERTS_DIR } from '../../config/paths.config';
import { createLogger, F } from '../../utils/logger.util';
import type { CertStatus } from '../../types/mobile.type';

const logger = createLogger('CertInstall');
const TIMEOUT_MS = 60000;
const CA_DIR = '/system/etc/security/cacerts';
const DEFAULT_CA = path.join(CERTS_DIR, 'ca.pem');

function exec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.toString().trim() || err.message));
      resolve(stdout.toString());
    });
  });
}

class CertInstallService {
  private async connect(serial: string): Promise<void> {
    if (serial.includes(':')) await exec('adb', ['connect', serial]).catch(() => '');
  }

  private async hashOf(caPath: string): Promise<string> {
    const out = await exec('openssl', ['x509', '-inform', 'PEM', '-subject_hash_old', '-noout', '-in', caPath]);
    return out.trim().split(/\r?\n/)[0];
  }

  async status(serial: string, caPath: string = DEFAULT_CA): Promise<CertStatus> {
    if (!fs.existsSync(caPath)) return { installed: false, hash: '', caAvailable: false };
    await this.connect(serial);
    const hash = await this.hashOf(caPath);
    const installed = await exec('adb', ['-s', serial, 'shell', `ls ${CA_DIR}/${hash}.0`])
      .then(() => true)
      .catch(() => false);
    return { installed, hash, caAvailable: true };
  }

  async install(serial: string, caPath: string = DEFAULT_CA): Promise<CertStatus> {
    if (!fs.existsSync(caPath)) throw new Error(`CA certificate not found: ${caPath}`);

    const current = await this.status(serial, caPath);
    if (current.installed) return current;

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ca-install-'));
    try {
      const local = path.join(tmp, `${current.hash}.0`);
      fs.copyFileSync(caPath, local);

      await exec('adb', ['-s', serial, 'root']).catch(() => '');
      await exec('adb', ['-s', serial, 'wait-for-device']);
      await exec('adb', ['-s', serial, 'remount']);
      await exec('adb', ['-s', serial, 'push', local, `${CA_DIR}/${current.hash}.0`]);
      await exec('adb', ['-s', serial, 'shell', `chmod 644 ${CA_DIR}/${current.hash}.0`]);
      await exec('adb', ['-s', serial, 'shell', `restorecon ${CA_DIR}/${current.hash}.0`]).catch(() => '');
      logger.info('CA installed to system store', F('serial', serial), F('hash', current.hash));
      return { ...current, installed: true };
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
}

export const certInstallService = new CertInstallService();