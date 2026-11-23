/**
 * ------------------------------------------------------------------
 * Service Manager Service
 * ------------------------------------------------------------------
 * Liệt kê và điều khiển service của hệ điều hành:
 *   Linux   : systemd  (systemctl)
 *   macOS   : launchd  (launchctl)
 *   Windows : SCM      (Win32_Service / net start|stop)
 * Điều khiển (start/stop/restart) mặc định TẮT — bật bằng SYSTEM_CONTROL_ENABLED=true.
 * Tên service được validate nghiêm ngặt và chỉ truyền qua execFile (không shell).
 * ------------------------------------------------------------------
 */

import { SERVICE_NAME_RE, TTL } from '../../constants';
import { AppError } from '../../errors/app.error';
import type {
  ManagedService,
  ServiceAction,
  ServiceList,
  ServiceQuery,
  ServiceStatus,
} from '../../types/system.type';
import { TtlCache } from '../../utils/async.util';
import { isLinux, isMacOS, isWindows } from '../../utils/platform.util';
import {
  parseJsonList,
  runCommandResult,
  tryCommand,
  tryPowerShell,
} from '../../utils/process.util';

interface Snapshot {
  supported: boolean;
  items: ManagedService[];
}

/** "1-02:03:04" | "02:03:04" | "03:04" → giây. */
function parseElapsed(text: string): number | null {
  const m = /^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/.exec(text.trim());
  if (!m) return null;
  const [, d, h, min, s] = m;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min) * 60 + Number(s);
}

/** Thời gian chạy (giây) của các PID qua `ps -o pid=,etime=`. */
async function elapsedByPid(pids: number[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (!pids.length) return result;
  const out = await tryCommand('ps', ['-o', 'pid=,etime=', '-p', pids.join(',')]);
  for (const line of out.split('\n')) {
    const [pid, elapsed] = line.trim().split(/\s+/);
    const sec = elapsed ? parseElapsed(elapsed) : null;
    if (pid && sec !== null) result.set(Number(pid), sec);
  }
  return result;
}

export class ServiceManagerService {
  private readonly cache = new TtlCache(isWindows ? TTL.servicesWindows : TTL.services, () =>
    this.load(),
  );

  constructor(private readonly controlEnabled: boolean) {}

  /** Toàn bộ service (không lọc) — dùng cho alert/security. */
  async all(): Promise<ManagedService[]> {
    return (await this.cache.get()).items;
  }

  async list(q: ServiceQuery = {}): Promise<ServiceList> {
    const { supported, items } = await this.cache.get();
    const counts: Record<ServiceStatus, number> = { running: 0, stopped: 0, failed: 0 };
    for (const s of items) counts[s.status]++;

    const term = q.query?.toLowerCase();
    const filtered = items.filter(
      (s) =>
        (!q.status || s.status === q.status) &&
        (!term ||
          s.name.toLowerCase().includes(term) ||
          s.description.toLowerCase().includes(term)),
    );
    return { supported, counts, items: filtered };
  }

  async control(name: string, action: ServiceAction): Promise<ManagedService | null> {
    if (!this.controlEnabled) {
      throw new AppError(
        'Service control is disabled. Set SYSTEM_CONTROL_ENABLED=true to enable it.',
        403,
        'CONTROL_DISABLED',
      );
    }
    if (!SERVICE_NAME_RE.test(name)) throw new AppError('invalid service name', 400);

    if (isLinux) await this.controlSystemd(name, action);
    else if (isWindows) await this.controlWindows(name, action);
    else await this.controlLaunchd(name, action);

    const { items } = await this.cache.get(true);
    return items.find((s) => s.name === name) ?? null;
  }

  // ─── Listing ──────────────────────────────────────────────────────────

  private load(): Promise<Snapshot> {
    if (isWindows) return this.loadWindows();
    if (isMacOS) return this.loadLaunchd();
    return this.loadSystemd();
  }

  private async loadSystemd(): Promise<Snapshot> {
    const res = await runCommandResult(
      'systemctl',
      ['list-units', '--type=service', '--all', '--no-legend', '--no-pager', '--plain'],
      { timeoutMs: 8_000 },
    );
    if (!res.ok) return { supported: false, items: [] };

    const items: ManagedService[] = [];
    for (const raw of res.stdout.split('\n')) {
      const m = /^(\S+)\.service\s+(\S+)\s+(\S+)\s+(\S+)\s*(.*)$/.exec(
        raw.trim().replace(/^[●*○×]\s*/, ''),
      );
      if (!m) continue;
      const [, name, load, active, , description] = m;
      if (load === 'not-found') continue;
      const status: ServiceStatus =
        active === 'failed'
          ? 'failed'
          : ['active', 'activating', 'reloading'].includes(active)
            ? 'running'
            : 'stopped';
      items.push({
        name,
        description: description.trim(),
        status,
        uptimeSec: null,
        restarts: null,
      });
    }

    await this.enrichSystemd(items);
    return { supported: true, items };
  }

  /** Bổ sung số lần restart và thời gian chạy (qua MainPID) cho unit đang active/failed. */
  private async enrichSystemd(items: ManagedService[]): Promise<void> {
    const live = items.filter((s) => s.status !== 'stopped');
    if (!live.length) return;

    const out = await tryCommand(
      'systemctl',
      [
        'show',
        ...live.map((s) => `${s.name}.service`),
        '--property=Id,MainPID,NRestarts',
        '--no-pager',
      ],
      { timeoutMs: 8_000 },
    );
    const byName = new Map(live.map((s) => [`${s.name}.service`, s]));
    const pids = new Map<string, number>();

    for (const block of out.split(/\n\s*\n/)) {
      const props = Object.fromEntries(
        block.split('\n').map((l) => {
          const i = l.indexOf('=');
          return [l.slice(0, i), l.slice(i + 1)];
        }),
      ) as Record<string, string>;
      const svc = byName.get(props.Id);
      if (!svc) continue;
      if (props.NRestarts !== undefined && props.NRestarts !== '')
        svc.restarts = Number(props.NRestarts);
      const pid = Number(props.MainPID);
      if (pid > 0) pids.set(svc.name, pid);
    }

    const elapsed = await elapsedByPid([...new Set(pids.values())]);
    for (const [name, pid] of pids) {
      const svc = byName.get(`${name}.service`);
      if (svc) svc.uptimeSec = elapsed.get(pid) ?? null;
    }
  }

  private async loadLaunchd(): Promise<Snapshot> {
    const res = await runCommandResult('launchctl', ['list'], { timeoutMs: 8_000 });
    if (!res.ok) return { supported: false, items: [] };

    const rows = res.stdout
      .split('\n')
      .slice(1) // header: PID Status Label
      .map((l) => l.trim().split(/\s+/))
      .filter((c) => c.length >= 3);

    const pids = rows.map((c) => Number(c[0])).filter((p) => p > 0);
    const elapsed = await elapsedByPid(pids);

    const items = rows.map(([pid, exit, label]): ManagedService => {
      const running = /^\d+$/.test(pid);
      return {
        name: label,
        description: label,
        status: running ? 'running' : Number(exit) !== 0 ? 'failed' : 'stopped',
        uptimeSec: running ? (elapsed.get(Number(pid)) ?? null) : null,
        restarts: null,
      };
    });
    return { supported: true, items };
  }

  private async loadWindows(): Promise<Snapshot> {
    const raw = await tryPowerShell(
      'Get-CimInstance Win32_Service | Select-Object Name,DisplayName,State | ConvertTo-Json -Compress',
      { timeoutMs: 15_000 },
    );
    const rows = parseJsonList<{ Name: string; DisplayName: string; State: string }>(raw);
    if (!rows.length) return { supported: false, items: [] };
    return {
      supported: true,
      items: rows.map((r): ManagedService => ({
        name: r.Name,
        description: r.DisplayName,
        status: r.State === 'Running' ? 'running' : 'stopped',
        uptimeSec: null,
        restarts: null,
      })),
    };
  }

  // ─── Control ──────────────────────────────────────────────────────────

  private async controlSystemd(name: string, action: ServiceAction): Promise<void> {
    const res = await runCommandResult('systemctl', [action, `${name}.service`], {
      timeoutMs: 30_000,
    });
    this.assertOk(res.ok, name, action, res.stderr);
  }

  private async controlWindows(name: string, action: ServiceAction): Promise<void> {
    if (action === 'restart') await runCommandResult('net', ['stop', name], { timeoutMs: 30_000 });
    const res = await runCommandResult('net', [action === 'stop' ? 'stop' : 'start', name], {
      timeoutMs: 30_000,
    });
    this.assertOk(res.ok, name, action, res.stderr || res.stdout);
  }

  // UNTESTED: launchd có nhiều domain (system / gui/<uid>); thử lần lượt.
  private async controlLaunchd(name: string, action: ServiceAction): Promise<void> {
    const uid = process.getuid?.() ?? 0;
    let lastError = '';
    for (const target of [`system/${name}`, `gui/${uid}/${name}`]) {
      const args =
        action === 'stop'
          ? ['kill', 'SIGTERM', target]
          : ['kickstart', ...(action === 'restart' ? ['-k'] : []), target];
      const res = await runCommandResult('launchctl', args, { timeoutMs: 30_000 });
      if (res.ok) return;
      lastError = res.stderr;
    }
    this.assertOk(false, name, action, lastError);
  }

  private assertOk(ok: boolean, name: string, action: ServiceAction, detail: string): void {
    if (ok) return;
    throw new AppError(
      `Failed to ${action} ${name}: ${detail.trim() || 'unknown error'}`,
      500,
      'SERVICE_CONTROL_FAILED',
    );
  }
}
