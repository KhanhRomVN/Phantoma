import { useNetworkStore } from '../stores/networkStore';
import { runTool } from '../utils/tool-result.util';

/** Execute list_hosts tool — đọc trực tiếp network store */
export async function executeListHosts(): Promise<string | null> {
  return runTool('list_hosts', () => {
    const hostMap = new Map<string, number>();
    for (const r of useNetworkStore.getState().requests) {
      const host = r.host || '(unknown)';
      hostMap.set(host, (hostMap.get(host) || 0) + 1);
    }

    const sorted = [...hostMap.entries()].sort((a, b) => b[1] - a[1]);
    const rows = sorted.map(([host, count]) => `- ${host.substring(0, 50)} (${count})`);

    return [`[list_hosts] Total unique hosts: ${sorted.length}`, ...rows].join('\n');
  });
}