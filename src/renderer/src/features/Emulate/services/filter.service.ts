// Filter Service - Logic for filtering requests
import { InspectorFilter } from '../types/filter.types';
import { NetworkRequest } from '../types/inspector';
import { getRequestCategory } from '../utils/requestHelpers';
import { DEFAULT_FILTER_STATE } from '../constants/defaults';

export class FilterService {
  /**
   * Check if a request passes all filters
   */
  matchesFilter(request: NetworkRequest, filter: InspectorFilter): boolean {
    // Method filter
    const method = request.method?.toUpperCase() || '';
    const methodKey = method as keyof typeof filter.methods;
    if (method && filter.methods[methodKey] === false) {
      return false;
    }

    // Host filter (whitelist)
    if (filter.host.whitelist.length > 0) {
      const hostMatch = filter.host.whitelist.some((h) =>
        request.host?.toLowerCase().includes(h.toLowerCase()),
      );
      if (!hostMatch) return false;
    }

    // Status filter
    const status = request.status;
    if (status && filter.status[status] === false) {
      return false;
    }

    // Type filter
    const type = getRequestCategory(request);
    if (filter.type[type as keyof typeof filter.type] === false) {
      return false;
    }

    return true;
  }

  /**
   * Filter an array of requests
   */
  filterRequests(requests: NetworkRequest[], filter: InspectorFilter): NetworkRequest[] {
    return requests.filter((req) => this.matchesFilter(req, filter));
  }

  /**
   * Search filter (text-based)
   */
  matchesSearch(
    request: NetworkRequest,
    searchTerm: string,
    options?: {
      matchCase?: boolean;
      matchWholeWord?: boolean;
      useRegex?: boolean;
    },
  ): boolean {
    if (!searchTerm) return true;

    const { matchCase = false, matchWholeWord = false, useRegex = false } = options || {};

    let regex: RegExp | null = null;

    if (useRegex) {
      try {
        const flags = matchCase ? 'g' : 'gi';
        regex = new RegExp(searchTerm, flags);
      } catch {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, matchCase ? '' : 'i');
      }
    } else {
      let pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (matchWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      regex = new RegExp(pattern, matchCase ? '' : 'i');
    }

    const match = (value: unknown): boolean => {
      if (value == null) return false;
      const str = String(value);
      if (regex) return regex.test(str);
      return matchCase
        ? str.includes(searchTerm)
        : str.toLowerCase().includes(searchTerm.toLowerCase());
    };

    // Check top-level fields
    if (
      match(request.id) ||
      match(request.method) ||
      match(request.protocol) ||
      match(request.host) ||
      match(request.path) ||
      match(request.status) ||
      match(request.type) ||
      match(request.size) ||
      match(request.time)
    ) {
      return true;
    }

    // Check headers
    const checkHeaders = (headers: Record<string, string> | undefined) => {
      if (!headers) return false;
      return Object.entries(headers).some(([k, v]) => match(k) || match(v));
    };

    if (checkHeaders(request.requestHeaders) || checkHeaders(request.responseHeaders)) {
      return true;
    }

    // Check bodies (limit to first 10KB for performance)
    const getBodyString = (body: string | object | undefined): string => {
      if (!body) return '';
      if (typeof body === 'string') return body.substring(0, 10240);
      return JSON.stringify(body).substring(0, 10240);
    };
    const limitedRequestBody = getBodyString(request.requestBody);
    const limitedResponseBody = getBodyString(request.responseBody);

    if (match(limitedRequestBody) || match(limitedResponseBody)) {
      return true;
    }

    return false;
  }

  /**
   * Apply both filter and search
   */
  filterAndSearch(
    requests: NetworkRequest[],
    filter: InspectorFilter,
    searchTerm: string,
    searchOptions?: {
      matchCase?: boolean;
      matchWholeWord?: boolean;
      useRegex?: boolean;
    },
  ): NetworkRequest[] {
    let result = this.filterRequests(requests, filter);

    if (searchTerm) {
      result = result.filter((req) => this.matchesSearch(req, searchTerm, searchOptions));
    }

    return result;
  }

  /**
   * Get available filter options from requests
   */
  getFilterOptions(requests: NetworkRequest[]) {
    const hosts = new Set<string>();
    const methods = new Set<string>();
    const statuses = new Set<number>();
    const types = new Set<string>();

    requests.forEach((req) => {
      if (req.host) hosts.add(req.host);
      if (req.method) methods.add(req.method.toUpperCase());
      if (req.status) statuses.add(req.status);
      const type = getRequestCategory(req);
      types.add(type);
    });

    return {
      hosts: Array.from(hosts).sort(),
      methods: Array.from(methods).sort(),
      statuses: Array.from(statuses).sort((a, b) => a - b),
      types: Array.from(types).sort(),
    };
  }

  /**
   * Reset filter to defaults
   */
  resetFilter(): InspectorFilter {
    return JSON.parse(JSON.stringify(DEFAULT_FILTER_STATE));
  }

  /**
   * Toggle a method in the filter
   */
  toggleMethod(filter: InspectorFilter, method: keyof InspectorFilter['methods']): InspectorFilter {
    return {
      ...filter,
      methods: {
        ...filter.methods,
        [method]: !filter.methods[method],
      },
    };
  }

  /**
   * Toggle a status in the filter
   */
  toggleStatus(filter: InspectorFilter, status: number): InspectorFilter {
    return {
      ...filter,
      status: {
        ...filter.status,
        [status]: !filter.status[status],
      },
    };
  }

  /**
   * Toggle a type in the filter
   */
  toggleType(filter: InspectorFilter, type: keyof InspectorFilter['type']): InspectorFilter {
    return {
      ...filter,
      type: {
        ...filter.type,
        [type]: !filter.type[type],
      },
    };
  }

  /**
   * Add host to whitelist
   */
  addHostWhitelist(filter: InspectorFilter, host: string): InspectorFilter {
    if (!host.trim()) return filter;
    const trimmed = host.trim();
    if (filter.host.whitelist.includes(trimmed)) return filter;
    return {
      ...filter,
      host: {
        whitelist: [...filter.host.whitelist, trimmed],
      },
    };
  }

  /**
   * Remove host from whitelist
   */
  removeHostWhitelist(filter: InspectorFilter, host: string): InspectorFilter {
    return {
      ...filter,
      host: {
        whitelist: filter.host.whitelist.filter((h) => h !== host),
      },
    };
  }
}

export const filterService = new FilterService();
export default filterService;
