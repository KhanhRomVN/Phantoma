/**
 * ------------------------------------------------------------------
 * Log Service
 * ------------------------------------------------------------------
 * Đọc log hệ thống theo từng nền tảng và chuẩn hoá về LogEntry:
 *   Linux   : journalctl (fallback /var/log/syslog | messages)
 *   macOS   : `log show`
 *   Windows : Get-WinEvent (kênh System)
 * Client poll bằng `since=<ts của entry cuối>` để nhận log mới.
 * ------------------------------------------------------------------
 */

import path from 'path';
import { LOG_LIMIT_MAX } from '../../constants';
import type { LogEntry, LogLevel, LogQuery, LogResult } from '../../types/system.type';
import { readTail } from '../../utils/file.util';
import { isMacOS, isWindows } from '../../utils/platform.util';
import { parseJsonList, runCommandResult, tryPowerShell } from '../../utils/process.util';

const SYSLOG_FILES = ['/var/log/syslog', '/var/log/messages'];
const SYSLOG_TAIL_BYTES = 256 * 1024;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type RawEntry = Omit<LogEntry, 'id'>;

const levelFromText = (text: string): LogLevel =>
  /\b(error|fail(ed|ure)?|fatal|panic|critical)\b/i.test(text)
    ? 'error'
    : /\bwarn(ing)?\b/i.test(text)
      ? 'warn'
      : /\bdebug\b/i.test(text)
        ? 'debug'
        : 'info';

/** syslog PRIORITY 0–7 → level. */
const levelFromPriority = (p: number): LogLevel =>
  p <= 3 ? 'error' : p === 4 ? 'warn' : p === 7 ? 'debug' : 'info';

export class LogService {
  async read(q: LogQuery): Promise<LogResult> {
    // Lấy dư để còn lọc theo level/query mà vẫn đủ `limit` dòng.
    const fetchCount = Math.min(LOG_LIMIT_MAX * 3, q.limit * 3);
    const raw = isWindows
      ? await this.readWindows(fetchCount)
      : isMacOS
        ? await this.readMac()
        : await this.readLinux(fetchCount, q.since);

    const term = q.query?.toLowerCase();
    const entries = raw.entries
      .filter((e) => q.since === undefined || e.ts > q.since)
      .filter((e) => !q.level || e.level === q.level)
      .filter((e) => !term || `${e.source} ${e.message}`.toLowerCase().includes(term))
      .sort((a, b) => a.ts - b.ts)
      .slice(-q.limit)
      .map((e, i): LogEntry => ({ ...e, id: `${e.ts}-${i}` }));

    return { source: raw.source, entries };
  }

  // ─── Linux ────────────────────────────────────────────────────────────

  private async readLinux(
    count: number,
    since?: number,
  ): Promise<{ source: string | null; entries: RawEntry[] }> {
    const args = ['-n', String(count), '-o', 'json', '--no-pager'];
    if (since !== undefined) args.push('--since', `@${Math.floor(since / 1000)}`);
    const res = await runCommandResult('journalctl', args, { timeoutMs: 8_000 });

    if (res.ok && res.stdout.trim()) {
      const entries: RawEntry[] = [];
      for (const line of res.stdout.split('\n')) {
        if (!line) continue;
        try {
          const j = JSON.parse(line) as Record<string, unknown>;
          const msg = Array.isArray(j.MESSAGE)
            ? Buffer.from(j.MESSAGE as number[]).toString('utf8')
            : String(j.MESSAGE ?? '');
          entries.push({
            ts: Math.floor(Number(j.__REALTIME_TIMESTAMP) / 1000),
            level: levelFromPriority(Number(j.PRIORITY ?? 6)),
            source: String(j.SYSLOG_IDENTIFIER ?? j._COMM ?? 'system'),
            message: msg,
          });
        } catch {
          // bỏ qua dòng JSON hỏng
        }
      }
      return { source: 'journalctl', entries };
    }
    return this.readSyslogFile();
  }

  private async readSyslogFile(): Promise<{ source: string | null; entries: RawEntry[] }> {
    for (const file of SYSLOG_FILES) {
      const text = await readTail(file, SYSLOG_TAIL_BYTES);
      if (text === null) continue;
      const year = new Date().getFullYear();
      const entries: RawEntry[] = [];
      for (const line of text.split('\n')) {
        const m =
          /^(\w{3})\s+(\d+)\s+(\d\d):(\d\d):(\d\d)\s+\S+\s+([^:[\s]+)(?:\[\d+\])?:\s*(.*)$/.exec(
            line,
          );
        const month = m ? MONTHS.indexOf(m[1]) : -1;
        if (!m || month < 0) continue;
        let ts = new Date(
          year,
          month,
          Number(m[2]),
          Number(m[3]),
          Number(m[4]),
          Number(m[5]),
        ).getTime();
        if (ts > Date.now() + 86_400_000)
          ts = new Date(
            year - 1,
            month,
            Number(m[2]),
            Number(m[3]),
            Number(m[4]),
            Number(m[5]),
          ).getTime();
        entries.push({ ts, level: levelFromText(m[7]), source: m[6], message: m[7] });
      }
      return { source: 'syslog', entries };
    }
    return { source: null, entries: [] };
  }

  // ─── macOS ────────────────────────────────────────────────────────────

  // UNTESTED trên macOS thật.
  private async readMac(): Promise<{ source: string | null; entries: RawEntry[] }> {
    const res = await runCommandResult('log', ['show', '--last', '2m', '--style', 'ndjson'], {
      timeoutMs: 20_000,
      maxBufferBytes: 32 * 1024 * 1024,
    });
    if (!res.ok) return { source: null, entries: [] };

    const entries: RawEntry[] = [];
    for (const line of res.stdout.split('\n')) {
      if (!line.startsWith('{')) continue;
      try {
        const j = JSON.parse(line) as Record<string, string>;
        // "2026-11-22 08:12:00.123456+0700" → ISO 8601
        const iso = j.timestamp.replace(' ', 'T').replace(/([+-]\d\d)(\d\d)$/, '$1:$2');
        const ts = Date.parse(iso);
        if (Number.isNaN(ts)) continue;
        entries.push({
          ts,
          level: /error|fault/i.test(j.messageType)
            ? 'error'
            : /debug/i.test(j.messageType)
              ? 'debug'
              : 'info',
          source: path.basename(j.processImagePath ?? 'system'),
          message: j.eventMessage ?? '',
        });
      } catch {
        // bỏ qua dòng hỏng
      }
    }
    return { source: 'log-show', entries };
  }

  // ─── Windows ──────────────────────────────────────────────────────────

  // UNTESTED trên Windows thật. `Level` dạng số (không phụ thuộc ngôn ngữ): 1-2 error, 3 warning, 4 info, 5 verbose.
  private async readWindows(
    count: number,
  ): Promise<{ source: string | null; entries: RawEntry[] }> {
    const raw = await tryPowerShell(
      `Get-WinEvent -LogName System -MaxEvents ${Math.floor(count)} | ForEach-Object { ` +
        '[pscustomobject]@{ ts=[DateTimeOffset]::new($_.TimeCreated).ToUnixTimeMilliseconds(); ' +
        'level=$_.Level; source=$_.ProviderName; message=$_.Message } } | ConvertTo-Json -Compress',
      { timeoutMs: 15_000 },
    );
    const rows = parseJsonList<{ ts: number; level: number; source: string; message: string }>(raw);
    if (!rows.length) return { source: null, entries: [] };
    return {
      source: 'windows-event',
      entries: rows.map((r) => ({
        ts: r.ts,
        level: r.level <= 2 ? 'error' : r.level === 3 ? 'warn' : r.level >= 5 ? 'debug' : 'info',
        source: r.source ?? 'System',
        message: String(r.message ?? '').split(/\r?\n/)[0],
      })),
    };
  }
}
