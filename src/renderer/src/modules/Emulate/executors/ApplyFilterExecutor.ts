import type { ApplyFilterParams } from '../parsers/ApplyFilterParser';
import { useFilterStore } from '../stores/filterStore';
import type { InspectorFilter } from '../types/filter.types';
import { runTool } from '../utils/tool-result.util';

const applyFilterParams = (filter: InspectorFilter, params: ApplyFilterParams): InspectorFilter => {
  let result = { ...filter };

  if (params.methods) {
    for (const { action, value } of params.methods) {
      const key = value as keyof typeof result.methods;
      if (key in result.methods) {
        result = { ...result, methods: { ...result.methods, [key]: action === 'show' } };
      }
    }
  }

  if (params.statuses) {
    for (const { action, value } of params.statuses) {
      result = { ...result, status: { ...result.status, [value]: action === 'show' } };
    }
  }

  if (params.types) {
    for (const { action, value } of params.types) {
      const key = value as keyof typeof result.type;
      if (key in result.type) {
        result = { ...result, type: { ...result.type, [key]: action === 'show' } };
      }
    }
  }

  if (params.hosts) {
    for (const { action, value } of params.hosts) {
      let whitelist = [...result.host.whitelist];
      if (action === 'add' && !whitelist.includes(value)) {
        whitelist.push(value);
      } else if (action === 'remove') {
        whitelist = whitelist.filter((h) => h !== value);
      }
      result = { ...result, host: { ...result.host, whitelist } };
    }
  }

  if (params.paths) {
    for (const { action, value } of params.paths) {
      let whitelist = [...result.path.whitelist];
      if (action === 'add' && !whitelist.includes(value)) {
        whitelist.push(value);
      } else if (action === 'remove') {
        whitelist = whitelist.filter((p) => p !== value);
      }
      result = { ...result, path: { ...result.path, whitelist } };
    }
  }

  if (params.size) {
    result = {
      ...result,
      size: { min: params.size.min ?? result.size.min, max: params.size.max ?? result.size.max },
    };
  }

  if (params.time) {
    result = {
      ...result,
      time: { min: params.time.min ?? result.time.min, max: params.time.max ?? result.time.max },
    };
  }

  return result;
};

/** Execute apply_filter tool — cập nhật filter store */
export async function executeApplyFilter(params: ApplyFilterParams): Promise<string | null> {
  return runTool('apply_filter', () => {
    const { filter, setFilter } = useFilterStore.getState();
    if (!filter) throw new Error('No current filter to modify');

    setFilter(applyFilterParams(filter, params));

    const changes: string[] = [];
    const listChange = (label: string, items?: Array<{ value: string | number; action: string }>) => {
      if (items) changes.push(`${label}: ${items.map((i) => `${i.value}(${i.action})`).join(', ')}`);
    };
    listChange('Methods', params.methods);
    listChange('Statuses', params.statuses);
    listChange('Types', params.types);
    listChange('Hosts', params.hosts);
    listChange('Paths', params.paths);
    if (params.size) changes.push(`Size: ${params.size.min || '0'}-${params.size.max || 'inf'}`);
    if (params.time) changes.push(`Time: ${params.time.min || '0'}-${params.time.max || 'inf'}`);

    return `[apply_filter] Applied: ${changes.join('; ') || 'no changes'}`;
  });
}