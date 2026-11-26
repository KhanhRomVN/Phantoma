import type { ProxyDraft, ProxyProtocol } from '../../../../shared/types/proxy-domain.types';
import { PROTOCOLS } from '../../../../shared/constants/proxy-meta.constants';

export interface ParsedLine {
  raw: string;
  key: string;
  valid: boolean;
  dupe: boolean;
  reason?: string;
  draft?: ProxyDraft;
}

export function parseLine(raw: string, fallback: ProxyProtocol): Omit<ParsedLine, 'dupe'> {
  let protocol = fallback;
  let rest = raw;
  const m = raw.match(/^([a-zA-Z0-9]+):[/][/](.+)$/);
  if (m) {
    const p = m[1].toLowerCase() as ProxyProtocol;
    if (!PROTOCOLS.includes(p)) return { raw, key: raw, valid: false, reason: `Unknown protocol "${m[1]}"` };
    protocol = p;
    rest = m[2];
  }
  let host = '';
  let port = '';
  let user = '';
  let pass = '';
  if (rest.includes('@')) {
    const idx = rest.lastIndexOf('@');
    const cred = rest.slice(0, idx).split(':');
    const hp = rest.slice(idx + 1).split(':');
    [user, pass] = [cred[0] ?? '', cred.slice(1).join(':')];
    [host, port] = [hp[0] ?? '', hp[1] ?? ''];
  } else {
    const parts = rest.split(':');
    if (parts.length === 2 || parts.length === 4) {
      [host, port, user, pass] = [parts[0], parts[1], parts[2] ?? '', parts[3] ?? ''];
    } else {
      return { raw, key: raw, valid: false, reason: 'Unrecognized format' };
    }
  }
  const portNum = Number(port);
  const key = `${host}:${port}`;
  if (!host) return { raw, key, valid: false, reason: 'Missing host' };
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) return { raw, key, valid: false, reason: 'Invalid port' };
  return {
    raw,
    key,
    valid: true,
    draft: {
      protocol,
      host,
      port: portNum,
      username: user,
      password: pass,
      kind: 'datacenter',
      ownership: 'private',
      country: 'VN',
      provider: 'Self-hosted',
      tags: [],
    },
  };
}

/**
 * Parses the pasted text (one proxy per line) and flags duplicates, both against the proxies that
 * already exist (`existingKeys`) and against earlier lines of the same text.
 */
export function parseImportText(text: string, fallback: ProxyProtocol, existingKeys: Set<string>): ParsedLine[] {
  const seen = new Set<string>();
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((raw) => {
      const p = parseLine(raw, fallback);
      const dupe = p.valid && (existingKeys.has(p.key) || seen.has(p.key));
      if (p.valid) seen.add(p.key);
      return { ...p, dupe };
    });
}
