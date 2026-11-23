/**
 * ------------------------------------------------------------------
 * Security Service
 * ------------------------------------------------------------------
 * Kiểm tra cấu hình bảo mật cơ bản + lịch sử đăng nhập. Mỗi check được
 * thực hiện đa nền tảng ở mức "tốt nhất có thể"; nếu không xác định được
 * (thiếu quyền, thiếu công cụ) thì trả status 'unknown' thay vì đoán.
 * Kết quả cache 60s vì một số lệnh khá chậm.
 * ------------------------------------------------------------------
 */

import * as si from 'systeminformation';
import { TTL } from '../../constants';
import type {
  LoginEvent,
  SecurityCheck,
  SecurityReport,
  SessionInfo,
} from '../../types/system.type';
import { TtlCache } from '../../utils/async.util';
import { listDir, readTextFile } from '../../utils/file.util';
import { isLinux, isMacOS, isWindows } from '../../utils/platform.util';
import {
  parseJsonList,
  runCommandResult,
  tryCommand,
  tryPowerShell,
} from '../../utils/process.util';
import type { PortService } from './port.service';
import type { ServiceManagerService } from './service-manager.service';
import type { StorageService } from './storage.service';

type CheckResult = Pick<SecurityCheck, 'detail' | 'status'>;

const unknown = (detail: string): CheckResult => ({ status: 'unknown', detail });
const truthy = (v: unknown): boolean => v === true || v === 1 || v === 'True' || v === 'true';

export class SecurityService {
  private readonly cache = new TtlCache(TTL.security, () => this.scan());

  constructor(
    private readonly ports: PortService,
    private readonly services: ServiceManagerService,
    private readonly storage: StorageService,
  ) {}

  report(force = false): Promise<SecurityReport> {
    return this.cache.get(force);
  }

  // ─── Scan ─────────────────────────────────────────────────────────────

  private async scan(): Promise<SecurityReport> {
    const entries: [string, string, Promise<CheckResult>][] = [
      ['firewall', 'Firewall', this.firewall()],
      ['disk-encryption', 'Disk encryption', this.diskEncryption()],
      ['updates', 'System updates', this.updates()],
      ['open-ports', 'Open ports', this.openPorts()],
      ['failed-services', 'Failed services', this.failedServices()],
      ['disk-health', 'Disk health (SMART)', this.diskHealth()],
    ];
    if (!isWindows) entries.splice(3, 0, ['ssh-root', 'SSH root login', this.sshRootLogin()]);

    const [results, logins, sessions] = await Promise.all([
      Promise.all(entries.map((e) => e[2].catch((): CheckResult => unknown('Check failed')))),
      this.loginHistory(),
      this.sessions(),
    ]);

    return {
      scannedAt: Date.now(),
      checks: entries.map(([id, name], i) => ({ id, name, ...results[i] })),
      logins: logins.events,
      loginsNote: logins.note,
      sessions,
    };
  }

  // ─── Checks ───────────────────────────────────────────────────────────

  private async firewall(): Promise<CheckResult> {
    if (isLinux) {
      const res = await runCommandResult('systemctl', [
        'is-active',
        'ufw',
        'firewalld',
        'nftables',
      ]);
      if (res.code === null) return unknown('systemctl is not available');
      const names = ['ufw', 'firewalld', 'nftables'];
      const active = res.stdout
        .split('\n')
        .map((s) => s.trim())
        .map((s, i) => (s === 'active' ? names[i] : null))
        .filter(Boolean);
      return active.length
        ? { status: 'ok', detail: `${active.join(', ')} active` }
        : { status: 'warn', detail: 'No active firewall service (ufw / firewalld / nftables)' };
    }
    if (isMacOS) {
      const out = await tryCommand('/usr/libexec/ApplicationFirewall/socketfilterfw', [
        '--getglobalstate',
      ]);
      if (!out) return unknown('Cannot query the application firewall');
      return /enabled/i.test(out)
        ? { status: 'ok', detail: 'Application firewall enabled' }
        : { status: 'warn', detail: 'Application firewall disabled' };
    }
    const rows = parseJsonList<{ Name: string; Enabled: unknown }>(
      await tryPowerShell(
        'Get-NetFirewallProfile | Select-Object Name,Enabled | ConvertTo-Json -Compress',
      ),
    );
    if (!rows.length) return unknown('Cannot query Windows Firewall');
    const off = rows.filter((r) => !truthy(r.Enabled)).map((r) => r.Name);
    if (!off.length) return { status: 'ok', detail: 'Enabled on all profiles' };
    return off.length === rows.length
      ? { status: 'bad', detail: 'Disabled on all profiles' }
      : { status: 'warn', detail: `Disabled profiles: ${off.join(', ')}` };
  }

  private async diskEncryption(): Promise<CheckResult> {
    if (isLinux) {
      const res = await runCommandResult('lsblk', ['-n', '-o', 'TYPE']);
      if (!res.ok) return unknown('lsblk is not available');
      return res.stdout.split('\n').some((l) => l.trim() === 'crypt')
        ? { status: 'ok', detail: 'dm-crypt / LUKS volume present' }
        : { status: 'warn', detail: 'No encrypted volumes detected' };
    }
    if (isMacOS) {
      const out = await tryCommand('fdesetup', ['status']);
      if (!out) return unknown('Cannot query FileVault');
      return /is On/i.test(out)
        ? { status: 'ok', detail: 'FileVault is on' }
        : { status: 'warn', detail: 'FileVault is off' };
    }
    const rows = parseJsonList<{ MountPoint: string; ProtectionStatus: unknown }>(
      await tryPowerShell(
        'Get-BitLockerVolume | Select-Object MountPoint,ProtectionStatus | ConvertTo-Json -Compress',
      ),
    );
    if (!rows.length) return unknown('BitLocker status requires administrator rights');
    const off = rows.filter((r) => Number(r.ProtectionStatus) !== 1).map((r) => r.MountPoint);
    return off.length
      ? { status: 'warn', detail: `BitLocker off on ${off.join(', ')}` }
      : { status: 'ok', detail: 'BitLocker on for all volumes' };
  }

  /** Chỉ kiểm tra được trên Linux dùng apt/dnf (đọc cache local, không gọi mạng). */
  private async updates(): Promise<CheckResult> {
    if (!isLinux) return unknown('Not checked on this platform');

    const apt = await runCommandResult('apt', ['list', '--upgradable'], { timeoutMs: 15_000 });
    if (apt.ok) {
      const count = apt.stdout.split('\n').filter((l) => l.includes('/')).length;
      return count
        ? { status: 'warn', detail: `${count} packages can be upgraded` }
        : { status: 'ok', detail: 'All packages are up to date' };
    }
    const dnf = await runCommandResult('dnf', ['-q', 'check-update'], { timeoutMs: 30_000 });
    if (dnf.code === 0) return { status: 'ok', detail: 'All packages are up to date' };
    if (dnf.code === 100) {
      const count = dnf.stdout.split('\n').filter((l) => /^\S+\.\S+\s+\S+\s+\S+/.test(l)).length;
      return { status: 'warn', detail: `${count} packages can be upgraded` };
    }
    return unknown('No supported package manager (apt / dnf)');
  }

  /** sshd: giá trị đầu tiên của PermitRootLogin thắng (drop-in .conf đứng trước file chính). */
  private async sshRootLogin(): Promise<CheckResult> {
    const dropIns = (await listDir('/etc/ssh/sshd_config.d'))
      .filter((f) => f.endsWith('.conf'))
      .sort();
    const files = [...dropIns.map((f) => `/etc/ssh/sshd_config.d/${f}`), '/etc/ssh/sshd_config'];
    let found = false;

    for (const file of files) {
      const text = await readTextFile(file);
      if (text === null) continue;
      found = true;
      const m = /^\s*PermitRootLogin\s+(\S+)/im.exec(text.replace(/#.*$/gm, ''));
      if (!m) continue;
      const value = m[1].toLowerCase();
      return value === 'yes'
        ? { status: 'bad', detail: 'PermitRootLogin is enabled' }
        : { status: 'ok', detail: `PermitRootLogin is ${value}` };
    }
    return found
      ? { status: 'ok', detail: 'PermitRootLogin not set (OpenSSH default: prohibit-password)' }
      : { status: 'ok', detail: 'No SSH server configuration found' };
  }

  private async openPorts(): Promise<CheckResult> {
    const exposed = (await this.ports.list()).filter((p) => p.exposure === 'public');
    if (!exposed.length) return { status: 'ok', detail: 'No ports exposed on all interfaces' };
    const shown = exposed
      .slice(0, 8)
      .map((p) => p.port)
      .join(', ');
    const more = exposed.length > 8 ? ` +${exposed.length - 8} more` : '';
    return {
      status: 'warn',
      detail: `${exposed.length} ports exposed on all interfaces (${shown}${more})`,
    };
  }

  private async failedServices(): Promise<CheckResult> {
    const items = await this.services.all();
    if (!items.length) return unknown('Service manager unavailable');
    const failed = items.filter((s) => s.status === 'failed');
    return failed.length
      ? {
          status: 'bad',
          detail: `${failed
            .slice(0, 3)
            .map((s) => s.name)
            .join(', ')} in failed state`,
        }
      : { status: 'ok', detail: 'No failed services' };
  }

  private async diskHealth(): Promise<CheckResult> {
    const disks = await this.storage.disks();
    if (!disks.length) return unknown('No SMART data available');
    const bad = disks.filter((d) => d.smart === 'warning');
    if (bad.length)
      return { status: 'warn', detail: `SMART warning on ${bad.map((d) => d.device).join(', ')}` };
    return disks.every((d) => d.smart === 'unknown')
      ? unknown('SMART status unavailable (smartctl / permissions)')
      : { status: 'ok', detail: 'All disks report healthy' };
  }

  // ─── Logins ───────────────────────────────────────────────────────────

  private async loginHistory(): Promise<{ events: LoginEvent[]; note: string | null }> {
    if (isWindows) {
      return {
        events: [],
        note: 'Login history is not available on Windows (needs the Security event log)',
      };
    }
    if (isMacOS) return this.macLogins();

    const [ok, bad] = await Promise.all([
      runCommandResult('last', ['-n', '10', '-w', '--time-format', 'iso']),
      runCommandResult('lastb', ['-n', '10', '-w', '--time-format', 'iso']),
    ]);
    const events = [...this.parseLast(ok.stdout, true), ...this.parseLast(bad.stdout, false)]
      .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
      .slice(0, 10);

    const notes: string[] = [];
    if (!ok.ok) notes.push('Cannot read /var/log/wtmp');
    if (!bad.ok) notes.push('Failed login attempts need root access to /var/log/btmp');
    return { events, note: notes.length ? notes.join('. ') : null };
  }

  private parseLast(output: string, success: boolean): LoginEvent[] {
    const events: LoginEvent[] = [];
    for (const line of output.split('\n')) {
      const m = /^(\S+)\s+(\S+)\s+(.*?)\s*(\d{4}-\d{2}-\d{2}T\S+)/.exec(line);
      if (!m || ['reboot', 'shutdown', 'runlevel'].includes(m[1])) continue;
      const ts = Date.parse(m[4]);
      events.push({ user: m[1], source: m[3] || m[2], ts: Number.isNaN(ts) ? null : ts, success });
    }
    return events;
  }

  // UNTESTED trên macOS thật: `last` không có năm nên suy ra từ năm hiện tại.
  private async macLogins(): Promise<{ events: LoginEvent[]; note: string | null }> {
    const out = await tryCommand('last', ['-10']);
    const year = new Date().getFullYear();
    const events: LoginEvent[] = [];
    for (const line of out.split('\n')) {
      const m = /^(\S+)\s+(\S+)\s+(.*?)\s*(\w{3}\s+\w{3}\s+\d+\s+\d\d:\d\d)/.exec(line);
      if (!m || ['reboot', 'shutdown'].includes(m[1])) continue;
      const ts = Date.parse(`${m[4]} ${year}`);
      events.push({
        user: m[1],
        source: m[3] || m[2],
        ts: Number.isNaN(ts) ? null : ts,
        success: true,
      });
    }
    return { events, note: 'Failed login attempts are not available on macOS' };
  }

  private async sessions(): Promise<SessionInfo[]> {
    const users = await si.users().catch(() => []);
    return users.map((u) => ({
      user: u.user,
      tty: u.tty,
      source: u.ip,
      since: `${u.date} ${u.time}`.trim(),
    }));
  }
}
