/**
 * ------------------------------------------------------------------
 * Mobile Device Service
 * ------------------------------------------------------------------
 * Liệt kê thiết bị Genymotion đang chạy bằng `gmtool admin list --running`.
 * ------------------------------------------------------------------
 */

import { execFile } from 'child_process';
import type { RunningMobileDevice } from '../../types/mobile.type';

const GMTOOL_TIMEOUT_MS = 8000;

function runGmtool(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('gmtool', args, { timeout: GMTOOL_TIMEOUT_MS }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

export async function listRunningGenymotionDevices(): Promise<RunningMobileDevice[]> {
  const output = await runGmtool(['admin', 'list', '--running']);
  return output
    .split('\n')
    .map((line) => line.split('|').map((col) => col.trim()))
    .filter((cols) => cols.length >= 4 && cols[0].toLowerCase() === 'on' && cols[1] !== '')
    .map(([, serial, uuid, name]) => ({ name, serial, uuid, type: 'running-vm' as const }));
}