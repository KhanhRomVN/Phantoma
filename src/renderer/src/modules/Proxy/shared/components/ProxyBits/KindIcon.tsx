import { cn } from '@renderer/utils/cn';
import { KIND_ICON } from '../../constants/kind-icon.constants';
import { KIND_META } from '../../constants/proxy-meta.constants';
import { TONE_CLASS } from '../../constants/tone.constants';
import type { ProxyKind } from '../../types/proxy-domain.types';

export function KindIcon({ kind, size = 32 }: { kind: ProxyKind; size?: number }) {
  const Icon = KIND_ICON[kind];
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-lg', TONE_CLASS[KIND_META[kind].tone].icon)}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}
