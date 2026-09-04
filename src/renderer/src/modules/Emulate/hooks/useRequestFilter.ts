/**
 * ------------------------------------------------------------------
 * useRequestFilter
 * ------------------------------------------------------------------
 * Hook quản lý bộ lọc network requests trong Inspector.
 * Bao gồm function thuần filterRequestsByConfig và hook React.
 *
 * Các functions chính:
 * - filterRequestsByConfig() : Lọc requests theo filter + search term
 *
 * Các hooks chính:
 * - useRequestFilter() : Quản lý filter state và các toggle actions
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useCallback } from 'react';

// ── Types ──
import { InspectorFilter } from '../types/filter.types';
import { NetworkRequest } from '../types/inspector';

// ── Constants ──
import { DEFAULT_FILTER_STATE } from '../constants/defaults';

// ── Utils ──
import { getRequestCategory } from '../utils/request-classifier.util';

// ─── Functions ──────────────────────────────────────────────────────────
export function filterRequestsByConfig(
  requests: NetworkRequest[],
  filter: InspectorFilter,
  searchTerm: string,
): NetworkRequest[] {
  const result = requests.filter((req) => {
    if (!req.host || req.host.trim() === '' || !req.url || req.url.trim() === '') {
      return false;
    }

    const method = req.method?.toUpperCase() || '';
    const methodKey = method as keyof typeof filter.methods;
    if (method && filter.methods[methodKey] === false) {
      return false;
    }

    if (filter.host.whitelist.length > 0) {
      const hostMatch = filter.host.whitelist.some((h) =>
        req.host?.toLowerCase().includes(h.toLowerCase()),
      );
      if (!hostMatch) return false;
    }

    const status = req.status;
    const failedStatus = status === 0 && req.responseHeaders?.['X-Request-Status'] === 'Failed';
    if (failedStatus) {
      if (filter.status['failed'] === false) {
        return false;
      }
    } else if (typeof status === 'number' && filter.status[status] === false) {
      return false;
    }

    const type = getRequestCategory(req);
    if (filter.type[type as keyof typeof filter.type] === false) {
      return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const searchable = [
        req.id,
        req.method,
        req.host,
        req.path,
        req.url,
        req.type,
        req.status?.toString(),
        req.size,
        req.time,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());

      if (!searchable.some((s) => s.includes(term))) {
        return false;
      }
    }

    return true;
  });

  return result;
}

// ─── Types ──────────────────────────────────────────────────────────────
interface UseRequestFilterOptions {
  initialFilter?: InspectorFilter;
  onFilterChange?: (filter: InspectorFilter) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────
export function useRequestFilter(options: UseRequestFilterOptions = {}) {
  const { initialFilter = DEFAULT_FILTER_STATE, onFilterChange } = options;

  // ── State ──
  const [filter, setFilter] = useState<InspectorFilter>(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Callbacks ──
  const updateFilter = useCallback(
    (newFilter: InspectorFilter | ((prev: InspectorFilter) => InspectorFilter)) => {
      setFilter((prev) => {
        const result = typeof newFilter === 'function' ? newFilter(prev) : newFilter;
        onFilterChange?.(result);
        return result;
      });
    },
    [onFilterChange],
  );

  const filterRequests = useCallback(
    (requests: NetworkRequest[]): NetworkRequest[] => {
      return filterRequestsByConfig(requests, filter, searchTerm);
    },
    [filter, searchTerm],
  );

  const resetFilter = useCallback(() => {
    setFilter(DEFAULT_FILTER_STATE);
    setSearchTerm('');
  }, []);

  const toggleMethod = useCallback(
    (method: keyof InspectorFilter['methods']) => {
      updateFilter((prev) => ({
        ...prev,
        methods: {
          ...prev.methods,
          [method]: !prev.methods[method],
        },
      }));
    },
    [updateFilter],
  );

  const toggleStatus = useCallback(
    (status: number) => {
      updateFilter((prev) => ({
        ...prev,
        status: {
          ...prev.status,
          [status]: !prev.status[status],
        },
      }));
    },
    [updateFilter],
  );

  const toggleType = useCallback(
    (type: keyof InspectorFilter['type']) => {
      updateFilter((prev) => ({
        ...prev,
        type: {
          ...prev.type,
          [type]: !prev.type[type],
        },
      }));
    },
    [updateFilter],
  );

  const addHostWhitelist = useCallback(
    (host: string) => {
      if (!host.trim()) return;
      updateFilter((prev) => ({
        ...prev,
        host: {
          whitelist: [...prev.host.whitelist, host.trim()],
        },
      }));
    },
    [updateFilter],
  );

  const removeHostWhitelist = useCallback(
    (host: string) => {
      updateFilter((prev) => ({
        ...prev,
        host: {
          whitelist: prev.host.whitelist.filter((h) => h !== host),
        },
      }));
    },
    [updateFilter],
  );

  return {
    filter,
    searchTerm,
    setSearchTerm,
    updateFilter,
    filterRequests,
    resetFilter,
    toggleMethod,
    toggleStatus,
    toggleType,
    addHostWhitelist,
    removeHostWhitelist,
  };
}

export default useRequestFilter;