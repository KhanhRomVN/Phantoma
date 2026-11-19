export interface WireGuardConf {
  email: string;
  privateKey: string;
  peerPublicKey: string;
  endpoint: string;
}

export function parseWireGuardConf(raw: string): WireGuardConf | null {
  const out: WireGuardConf = { email: '', privateKey: '', peerPublicKey: '', endpoint: '' };
  let section = '';
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    const header = t.match(/^\[(\w+)\]$/);
    if (header) {
      section = header[1].toLowerCase();
      continue;
    }
    const mail = t.match(/^#\s*Key for\s+(\S+)/i);
    if (mail) {
      out.email = mail[1];
      continue;
    }
    const kv = t.match(/^(\w+)\s*=\s*(.+)$/);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const value = kv[2].trim();
    if (section === 'interface' && key === 'privatekey') out.privateKey = value;
    else if (section === 'peer' && key === 'publickey') out.peerPublicKey = value;
    else if (section === 'peer' && key === 'endpoint') out.endpoint = value;
  }
  return out.privateKey && out.peerPublicKey && out.endpoint ? out : null;
}