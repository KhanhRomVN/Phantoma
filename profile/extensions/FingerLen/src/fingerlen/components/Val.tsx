import { ShieldAlert } from 'lucide-react';
import { hue } from '../utils/format';

export function Val({ v, risky }: { v: unknown; risky?: boolean }) {
  if (typeof v === 'boolean') return <span className={'bv ' + (risky ? (v ? 'warn' : 'ok') : '')}><i />{v ? 'Yes' : 'No'}</span>;
  if (Array.isArray(v)) return v.length ? <span className="chips">{v.map((x, i) => <span key={i}>{String(x)}</span>)}</span> : <span className="nv0">None</span>;
  if (v == null || v === '') return <span className="nv0">n/a</span>;
  const str = String(v);
  return <span style={/^[0-9a-f]{8}$/.test(str) ? { color: hue(str) } : undefined}>{str}</span>;
}

export function Note({ text }: { text: string }) {
  return <p className="note"><ShieldAlert size={14} />{text}</p>;
}