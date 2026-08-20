import { AmassScanParams, SubdomainResult, AmassScanResult } from './types';
import { OUTPUT_FORMATS } from './constants';
import {
  saveTargetHistory as saveTargetHistoryShared,
  saveScanHistory as saveScanHistoryShared,
} from '@renderer/modules/Tool/utils/history';

export const buildCommand = (params: AmassScanParams): string => {
  const parts = ['amass', params.mode];

  if (params.passiveOnly && !params.activeEnabled) {
    parts.push('-passive');
  }
  if (params.activeEnabled && !params.passiveOnly) {
    parts.push('-active');
  }
  if (params.bruteForce) {
    parts.push('-brute');
  }
  if (params.wordlist && params.wordlist.trim()) {
    parts.push(`-w ${params.wordlist}`);
  }
  if (params.includeSources && params.includeSources.trim()) {
    parts.push(`-include ${params.includeSources}`);
  }
  if (params.excludeSources && params.excludeSources.trim()) {
    parts.push(`-exclude ${params.excludeSources}`);
  }
  if (params.resolvers && params.resolvers.trim()) {
    parts.push(`-resolvers ${params.resolvers}`);
  }
  if (params.dnsQps > 0 && params.dnsQps !== 10) {
    parts.push(`-dns-qps ${params.dnsQps}`);
  }
  if (params.timeout > 0 && params.timeout !== 60) {
    parts.push(`-timeout ${params.timeout}`);
  }

  const fmt = OUTPUT_FORMATS.find((f) => f.value === params.outputFormat);
  if (fmt && fmt.value !== 'text') {
    parts.push(fmt.flag);
  }

  if (params.additionalFlags?.trim()) {
    parts.push(params.additionalFlags.trim());
  }

  parts.push(`-d ${params.target || '<target>'}`);
  return parts.join(' ');
};

export const buildFlags = (params: AmassScanParams): string[] => {
  const flags: string[] = [];
  flags.push(params.mode);

  if (params.passiveOnly && !params.activeEnabled) {
    flags.push('-passive');
  }
  if (params.activeEnabled && !params.passiveOnly) {
    flags.push('-active');
  }
  if (params.bruteForce) {
    flags.push('-brute');
  }
  if (params.wordlist && params.wordlist.trim()) {
    flags.push('-w', params.wordlist);
  }
  if (params.includeSources && params.includeSources.trim()) {
    flags.push('-include', params.includeSources);
  }
  if (params.excludeSources && params.excludeSources.trim()) {
    flags.push('-exclude', params.excludeSources);
  }
  if (params.resolvers && params.resolvers.trim()) {
    flags.push('-resolvers', params.resolvers);
  }
  if (params.dnsQps > 0 && params.dnsQps !== 10) {
    flags.push('-dns-qps', params.dnsQps.toString());
  }
  if (params.timeout > 0 && params.timeout !== 60) {
    flags.push('-timeout', params.timeout.toString());
  }

  const fmt = OUTPUT_FORMATS.find((f) => f.value === params.outputFormat);
  if (fmt && fmt.value !== 'text') {
    flags.push(fmt.flag);
  }

  if (params.additionalFlags?.trim()) {
    const rawFlags = params.additionalFlags.trim().split(/\s+/);
    flags.push(...rawFlags);
  }

  return flags;
};

export const parseAmassOutput = (output: string): SubdomainResult[] => {
  const lines = output.split('\n');
  const subdomains: SubdomainResult[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (
      trimmed.startsWith('[INF]') ||
      trimmed.startsWith('[ERR]') ||
      trimmed.startsWith('[') ||
      trimmed.includes('Starting')
    ) {
      continue;
    }

    let name = trimmed;
    let source: string | undefined;

    const parenMatch = trimmed.match(/^(.*?)\s*\(Source:\s*(\w+)\)/);
    if (parenMatch) {
      name = parenMatch[1];
      source = parenMatch[2];
    } else {
      const spaceIdx = trimmed.indexOf(' ');
      if (spaceIdx > 0 && trimmed[0] !== '-') {
        name = trimmed.substring(0, spaceIdx);
      }
    }

    if (name && !seen.has(name) && name.includes('.')) {
      seen.add(name);
      subdomains.push({ name, source, type: 'fqdn' });
    }
  }

  return subdomains;
};

// Re-export shared history utilities (đã gộp từ utils chung)
export { getDateLabel, groupHistoryByDate } from '@renderer/modules/Tool/utils/history';

export const saveTargetHistory = (target: string, setTargetHistory: any) => {
  saveTargetHistoryShared(target, setTargetHistory, 'amass_target_history');
};

export const saveScanHistory = (history: AmassScanResult[]) => {
  saveScanHistoryShared(history, 'amass_scan_history');
};