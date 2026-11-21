import { execFile } from 'child_process';
import { createLogger, F } from '../../utils/logger.util';
import type { FridaStatus } from '../../types/mobile.type';

const logger = createLogger('Frida');
const ADB_TIMEOUT_MS = 10000;
const REMOTE_DIR = '/data/local/tmp';
const START_POLL_MS = 500;
const START_POLL_TRIES = 8;

type RootRun = (cmd: string) => Promise<string>;

function adbHost(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('adb', args, { timeout: ADB_TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.toString().trim() || err.message));
      resolve(stdout.toString());
    });
  });
}

class FridaService {
  // ASSUMED: frida-server binary is pre-pushed to /data/local/tmp/frida-server*
  private async getRootRun(serial: string): Promise<RootRun> {
    const adb = (args: string[]) => adbHost(['-s', serial, ...args]);

    if (serial.includes(':')) {
      await adbHost(['connect', serial]).catch((err) =>
        logger.warn('adb connect failed', F('serial', serial), F('error', String(err))),
      );
    }

    // ASSUMED: Genymotion only — adb shell runs as root when Root access is enabled
    if ((await adb(['shell', 'id', '-u'])).trim() === '0') return (cmd) => adb(['shell', cmd]);

    throw new Error(
      'adb shell is not root: enable Settings > Developer options > Root access (Apps and ADB) in the Genymotion device',
    );
  }

  private async findPid(run: RootRun): Promise<number | null> {
    const out = (await run('pidof frida-server').catch(() => '')).trim();
    const pid = parseInt(out.split(/\s+/)[0] ?? '', 10);
    return Number.isFinite(pid) ? pid : null;
  }

  private async findBinary(run: RootRun): Promise<string | null> {
    const out = await run(`ls ${REMOTE_DIR}/frida-server* 2>/dev/null`).catch(() => '');
    return out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0] ?? null;
  }

  async ensureRunning(serial: string): Promise<FridaStatus> {
    const run = await this.getRootRun(serial);

    const existing = await this.findPid(run);
    if (existing) {
      logger.info('frida-server already running', F('serial', serial), F('pid', String(existing)));
      return { running: true, started: false, pid: existing, binary: null };
    }

    const binary = await this.findBinary(run);
    if (!binary) throw new Error(`frida-server not found in ${REMOTE_DIR} (adb push it first)`);

    await run(`chmod 755 ${binary}`);
    await run(`nohup ${binary} -D >/dev/null 2>&1 &`);

    for (let i = 0; i < START_POLL_TRIES; i++) {
      await new Promise((r) => setTimeout(r, START_POLL_MS));
      const pid = await this.findPid(run);
      if (pid) {
        logger.info('frida-server started', F('serial', serial), F('pid', String(pid)));
        return { running: true, started: true, pid, binary };
      }
    }
    throw new Error('frida-server failed to start (check binary architecture matches the device)');
  }

  async stop(serial: string): Promise<void> {
    const run = await this.getRootRun(serial);
    await run('pkill -f frida-server').catch(() => '');
  }
}

export const fridaService = new FridaService();