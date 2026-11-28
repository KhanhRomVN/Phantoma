import { PROTOCOL_META } from '../../constants/proxy-meta.constants';
import type { ProxyProtocol } from '../../types/proxy-domain.types';
import { Pill } from './Pill';

export function ProtocolTag({ protocol }: { protocol: ProxyProtocol }) {
  const m = PROTOCOL_META[protocol];
  return (
    <Pill tone={m.tone} className='font-mono text-[10px] tracking-wide'>
      {m.label}
    </Pill>
  );
}
