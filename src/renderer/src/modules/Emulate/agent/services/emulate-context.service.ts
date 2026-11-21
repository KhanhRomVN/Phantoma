/**
 * Đọc trực tiếp network/filter store để dựng dữ liệu ngữ cảnh cho Zen
 * chat (traffic summary, filter text), thay cho EmulateController.
 */

import { useFilterStore } from '../../features/traffic/stores/filter.store';
import { useNetworkStore } from '../../features/traffic/stores/network.store';

import type { TrafficSummary } from '../prompts/analyzer';
import type { InspectorFilter } from '../../shared/types/filter.types';
import type { NetworkRequest } from '../../shared/types/network.types';

import { getRequestCategory } from '../../shared/utils/request-classifier.util';

const sortByCountDesc = <T>(map: Map<T, number>) =>
  [...map.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));

export function getTrafficSummary(): TrafficSummary {
  const requests = useNetworkStore.getState().requests;
  const hostMap = new Map<string, number>();
  const methodMap = new Map<string, number>();
  const statusMap = new Map<number, number>();
  const typeMap = new Map<string, number>();

  for (const r of requests) {
    const host = r.host || '(unknown)';
    hostMap.set(host, (hostMap.get(host) || 0) + 1);

    const method = r.method || 'UNKNOWN';
    methodMap.set(method, (methodMap.get(method) || 0) + 1);

    if (r.status !== undefined && r.status !== null) {
      statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1);
    }

    const type = r.type || 'other';
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  }

  return {
    hosts: sortByCountDesc(hostMap),
    methods: sortByCountDesc(methodMap),
    statuses: sortByCountDesc(statusMap) as { value: number; count: number }[],
    types: sortByCountDesc(typeMap),
  };
}

export function getCurrentFilter(): InspectorFilter | undefined {
  return useFilterStore.getState().filter;
}

function buildFilterText(filter: InspectorFilter, requests: NetworkRequest[]): string {
  const lines: string[] = [];

  const availableMethods = new Set(requests.map((r) => r.method?.toUpperCase()).filter(Boolean));
  const availableStatuses = new Set(
    requests
      .filter((r) => r.protocol === 'https' && typeof r.status === 'number')
      .map((r) => r.status as number),
  );
  const availableTypes = new Set(requests.map((r) => getRequestCategory(r)).filter(Boolean));

  if (availableMethods.size > 0) {
    const methodList: string[] = [];
    for (const method of availableMethods) {
      const enabled = filter.methods[method as keyof typeof filter.methods] !== false;
      methodList.push(enabled ? method : `${method}(hide)`);
    }
    lines.push(`Methods: ${methodList.join(', ')}`);
  }

  if (filter.host.whitelist.length > 0) {
    lines.push(`Hosts: ${filter.host.whitelist.join(', ')}`);
  }

  if (filter.path.whitelist.length > 0) {
    lines.push(`Paths: ${filter.path.whitelist.join(', ')}`);
  }

  if (availableStatuses.size > 0) {
    const statusList: string[] = [];
    for (const code of availableStatuses) {
      const enabled = filter.status[code] !== false;
      statusList.push(enabled ? String(code) : `${code}(hide)`);
    }
    lines.push(`Statuses: ${statusList.join(', ')}`);
  }

  if (availableTypes.size > 0) {
    const typeList: string[] = [];
    for (const type of availableTypes) {
      const enabled = filter.type[type as keyof typeof filter.type] !== false;
      typeList.push(enabled ? type : `${type}(hide)`);
    }
    lines.push(`Types: ${typeList.join(', ')}`);
  }

  if (filter.size.min || filter.size.max) {
    lines.push(`Size: ${filter.size.min || '0'}-${filter.size.max || 'inf'}`);
  }

  if (filter.time.min || filter.time.max) {
    lines.push(`Time: ${filter.time.min || '0'}-${filter.time.max || 'inf'}`);
  }

  return lines.join('\n');
}

export function getFilterText(): string {
  const filter = useFilterStore.getState().filter;
  if (!filter) return '';
  return buildFilterText(filter, useNetworkStore.getState().requests);
}