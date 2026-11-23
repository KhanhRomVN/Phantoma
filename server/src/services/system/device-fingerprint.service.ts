/**
 * ------------------------------------------------------------------
 * Device Fingerprint Service
 * ------------------------------------------------------------------
 * Thu thập thông tin thiết bị (OS, GPU, browser, locale...) để profile
 * browser giả lập khớp với máy thật. Kết quả được cache vì không đổi.
 * ------------------------------------------------------------------
 */

import os from 'os';
import type { DeviceFingerprint } from '../../types/device.type';
import { isMacOS, isWindows, PLATFORM } from '../../utils/platform.util';
import { tryCommand, tryPowerShell } from '../../utils/process.util';

export class DeviceFingerprintService {
  private cache: Promise<DeviceFingerprint> | null = null;

  get(): Promise<DeviceFingerprint> {
    this.cache ??= this.build();
    return this.cache;
  }

  private async build(): Promise<DeviceFingerprint> {
    const [gpu, browser] = await Promise.all([this.detectGpu(), this.detectChrome()]);
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    return {
      ...this.detectOs(),
      browser,
      gpu,
      cores: os.cpus().length,
      memory: Math.round(os.totalmem() / 1024 ** 3),
      lang: resolved.locale,
      tz: resolved.timeZone,
      cc: resolved.locale.split('-')[1] ?? 'US',
    };
  }

  private async detectGpu(): Promise<string> {
    if (isMacOS) {
      const out = await tryCommand('system_profiler', ['SPDisplaysDataType']);
      return /Chipset Model:\s*(.+)/.exec(out)?.[1].trim() ?? 'Unknown GPU';
    }
    if (isWindows) {
      const out = await tryPowerShell(
        '(Get-CimInstance Win32_VideoController | Select-Object -First 1).Name',
        { timeoutMs: 4000 },
      );
      return out.trim() || 'Unknown GPU';
    }
    const out = await tryCommand('lspci', [], { timeoutMs: 4000 });
    const line = out.split('\n').find((l) => /vga|3d|display/i.test(l));
    if (!line) return 'Unknown GPU';
    return line
      .split(': ')
      .slice(1)
      .join(': ')
      .replace(/\s*\(rev .*\)$/, '')
      .trim();
  }

  private async detectChrome(): Promise<string> {
    let out = '';
    if (isMacOS) {
      out = await tryCommand('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
        '--version',
      ]);
    } else if (isWindows) {
      out = await tryCommand('reg', [
        'query',
        'HKCU\\Software\\Google\\Chrome\\BLBeacon',
        '/v',
        'version',
      ]);
    } else {
      out = await tryCommand('google-chrome', ['--version']);
    }
    const major = /(\d+)\.\d+\.\d+\.\d+/.exec(out)?.[1] ?? process.versions.chrome?.split('.')[0];
    return major ? `Chrome ${major}` : 'Chrome';
  }

  private detectOs(): Pick<DeviceFingerprint, 'family' | 'os'> {
    if (isWindows) {
      const build = Number(os.release().split('.')[2] ?? 0);
      return { family: PLATFORM, os: build >= 22000 ? 'Windows 11' : 'Windows 10' };
    }
    if (isMacOS) {
      return { family: PLATFORM, os: `macOS ${Number(os.release().split('.')[0]) - 9}` };
    }
    return { family: PLATFORM, os: 'Linux' };
  }
}
