/**
 * ------------------------------------------------------------------
 * Process Service
 * ------------------------------------------------------------------
 * Danh sách tiến trình (lọc / sắp xếp / giới hạn). Số thread chỉ có trên
 * Linux (đọc /proc/<pid>/status) và chỉ cho các dòng được trả về.
 * ------------------------------------------------------------------
 */

import type { ProcessInfo, ProcessList, ProcessQuery } from '../../types/system.type';
import { readTextFile } from '../../utils/file.util';
import { round } from '../../utils/number.util';
import { isLinux } from '../../utils/platform.util';
import type { SystemProbeService } from './system-probe.service';

export class ProcessService {
  constructor(private readonly probe: SystemProbeService) {}

  async list(q: ProcessQuery): Promise<ProcessList> {
    const data = await this.probe.processes.get();
    const term = q.query?.toLowerCase();

    const rows = term
      ? data.list.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.command.toLowerCase().includes(term) ||
            String(p.pid) === term,
        )
      : [...data.list];

    rows.sort((a, b) =>
      q.sort === 'pid' ? a.pid - b.pid : q.sort === 'mem' ? b.memRss - a.memRss : b.cpu - a.cpu,
    );

    const top = rows.slice(0, q.limit);
    const threads = await Promise.all(top.map((p) => this.threadCount(p.pid)));

    return {
      total: data.all,
      running: data.running,
      sleeping: data.sleeping,
      items: top.map((p, i): ProcessInfo => ({
        pid: p.pid,
        parentPid: p.parentPid,
        name: p.name,
        user: p.user,
        cpuPct: round(p.cpu),
        memBytes: p.memRss * 1024, // systeminformation trả KiB
        memPct: round(p.mem),
        threads: threads[i],
        state: p.state,
        command: `${p.command} ${p.params}`.trim(),
      })),
    };
  }

  private async threadCount(pid: number): Promise<number | null> {
    if (!isLinux) return null;
    const status = await readTextFile(`/proc/${pid}/status`);
    const m = status ? /^Threads:\s+(\d+)/m.exec(status) : null;
    return m ? Number(m[1]) : null;
  }
}
