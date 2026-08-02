import { EmulateController } from '../../../../../../../../controller/EmulateController';
import type { ApplyFilterParams } from '../../parsers/emulate/ApplyFilterParser';

/**
 * Execute apply_filter tool — áp dụng filter thay đổi từ AI.
 * Nhận ApplyFilterParams đã được parse từ ResponseParser.
 */
export async function executeApplyFilter(params: ApplyFilterParams): Promise<string | null> {
  try {
    const ctrl = EmulateController.getInstance();
    const currentFilter = ctrl.getFilter();

    if (!currentFilter) {
      return '[apply_filter] Result: Error - No current filter to modify';
    }

    ctrl.applyFilterChanges(params);

    // Build summary
    const changes: string[] = [];
    if (params.methods) changes.push(`Methods: ${params.methods.map(m => `${m.value}(${m.action})`).join(', ')}`);
    if (params.statuses) changes.push(`Statuses: ${params.statuses.map(s => `${s.value}(${s.action})`).join(', ')}`);
    if (params.types) changes.push(`Types: ${params.types.map(t => `${t.value}(${t.action})`).join(', ')}`);
    if (params.hosts) changes.push(`Hosts: ${params.hosts.map(h => `${h.value}(${h.action})`).join(', ')}`);
    if (params.paths) changes.push(`Paths: ${params.paths.map(p => `${p.value}(${p.action})`).join(', ')}`);
    if (params.size) changes.push(`Size: ${params.size.min || '0'}-${params.size.max || 'inf'}`);
    if (params.time) changes.push(`Time: ${params.time.min || '0'}-${params.time.max || 'inf'}`);

    return `[apply_filter] Applied: ${changes.join('; ') || 'no changes'}`;
  } catch (e: any) {
    return `[apply_filter] Result: Error - ${e.message || 'Unknown error'}`;
  }
}