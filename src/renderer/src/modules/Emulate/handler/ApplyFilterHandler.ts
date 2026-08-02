/**
 * ApplyFilterHandler — Áp dụng thay đổi filter từ AI request.
 *
 * Usage:
 *   const handler = new ApplyFilterHandler();
 *   handler.apply(filter, params);
 *
 * Nhận InspectorFilter hiện tại và params từ ApplyFilterParser,
 * trả về InspectorFilter mới sau khi áp dụng thay đổi.
 */
import { InspectorFilter } from '../types/filter.types';
import type { ApplyFilterParams } from '@renderer/components/RightPanel/Agent/feature/Chat/services/parsers/emulate/ApplyFilterParser';

export class ApplyFilterHandler {
  public apply(filter: InspectorFilter, params: ApplyFilterParams): InspectorFilter {
    let result = { ...filter };

    // Methods
    if (params.methods) {
      for (const { action, value } of params.methods) {
        const key = value as keyof typeof result.methods;
        if (key in result.methods) {
          result = {
            ...result,
            methods: { ...result.methods, [key]: action === 'show' },
          };
        }
      }
    }

    // Statuses
    if (params.statuses) {
      for (const { action, value } of params.statuses) {
        result = {
          ...result,
          status: { ...result.status, [value]: action === 'show' },
        };
      }
    }

    // Types
    if (params.types) {
      for (const { action, value } of params.types) {
        const key = value as keyof typeof result.type;
        if (key in result.type) {
          result = {
            ...result,
            type: { ...result.type, [key]: action === 'show' },
          };
        }
      }
    }

    // Hosts
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

    // Paths
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

    // Size
    if (params.size) {
      result = {
        ...result,
        size: {
          min: params.size.min ?? result.size.min,
          max: params.size.max ?? result.size.max,
        },
      };
    }

    // Time
    if (params.time) {
      result = {
        ...result,
        time: {
          min: params.time.min ?? result.time.min,
          max: params.time.max ?? result.time.max,
        },
      };
    }

    return result;
  }
}