import type { ProxyDraft, ProxyProtocol } from '../../../../../shared/types/proxy-domain.types';
import { PROTOCOLS } from '../../../../../shared/constants/proxy-meta.constants';

/** Parses a pasted proxy string (`proto://user:pass@host:port`, `host:port`, `host:port:user:pass`). */
export function parseProxyInput(raw: string): Partial<ProxyDraft> | null {
  const text = raw.trim();
  if (!text) return null;
  let protocol: ProxyProtocol | undefined;
  let rest = text;
  const m = text.match(/^([a-zA-Z0-9]+):[/][/](.+)$/);
  if (m) {
    const p = m[1].toLowerCase() as ProxyProtocol;
    if (!PROTOCOLS.includes(p)) return null;
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
    user = cred[0] ?? '';
    pass = cred.slice(1).join(':');
    host = hp[0] ?? '';
    port = hp[1] ?? '';
  } else {
    const parts = rest.split(':');
    if (parts.length !== 2 && parts.length !== 4) return null;
    [host, port, user, pass] = [parts[0], parts[1], parts[2] ?? '', parts[3] ?? ''];
  }
  const portNum = Number(port);
  if (!host || !Number.isInteger(portNum) || portNum < 1 || portNum > 65535) return null;
  return { ...(protocol ? { protocol } : {}), host, port: portNum, username: user, password: pass };
}
