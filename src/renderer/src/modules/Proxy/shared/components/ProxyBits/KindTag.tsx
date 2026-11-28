import { KIND_ICON } from '../../constants/kind-icon.constants';
import { KIND_META } from '../../constants/proxy-meta.constants';
import type { ProxyKind } from '../../types/proxy-domain.types';
import { Pill } from './Pill';

export function KindTag({ kind }: { kind: ProxyKind }) {
  const m = KIND_META[kind];
  const Icon = KIND_ICON[kind];
  return (
    <Pill tone={m.tone}>
      <Icon className='h-3 w-3' />
      {m.label}
    </Pill>
  );
}
