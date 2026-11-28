import { useState } from 'react';
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import type { ProxySource } from '../../../../shared/types/source-domain.types';
import type { SourceStats } from '../../types/source.types';
import { EMPTY_STATS } from '../../utils/source-stats';
import { SourceContextMenu } from './SourceContextMenu';
import type { SourceMenuState } from './SourceContextMenu';
import { SourceTab } from './SourceTab';
import { SourceTip } from './SourceTip';

interface SourceBarProps {
  sources: ProxySource[];
  activeId: string;
  stats: Record<string, SourceStats>;
  onChange: (id: string) => void;
  actions?: ReactNode;
  onAddSource?: () => void;
  onEditSource?: (id: string) => void;
  onDeleteSource?: (id: string) => void;
}

export function SourceBar({
  sources,
  activeId,
  stats,
  onChange,
  actions,
  onAddSource,
  onEditSource,
  onDeleteSource,
}: SourceBarProps) {
  const [menu, setMenu] = useState<SourceMenuState | null>(null);
  const menuSource = menu ? (sources.find((s) => s.id === menu.id) ?? null) : null;

  return (
    <div className='relative flex items-center gap-3'>
      <span className='shrink-0 text-xs font-medium text-text-secondary'>Source:</span>
      <div className='flex min-w-0 flex-1'>
        <div className='inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md bg-text-secondary/10 p-0.5'>
          {sources.map((s) => (
            <SourceTab
              key={s.id}
              active={activeId === s.id}
              onClick={() => onChange(s.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ id: s.id, top: e.clientY, left: e.clientX });
              }}
              tip={menu?.id === s.id ? undefined : <SourceTip source={s} stats={stats[s.id] ?? EMPTY_STATS} />}
              source={s}
            />
          ))}
          <Tooltip content='Add source' side='bottom'>
            <button
              type='button'
              onClick={onAddSource}
              className='flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-text-secondary transition-colors hover:bg-text-secondary/10 hover:text-text-primary'
            >
              <Plus className='h-3.5 w-3.5' />
            </button>
          </Tooltip>
        </div>
      </div>
      {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}

      <SourceContextMenu
        menu={menu}
        source={menuSource}
        onClose={() => setMenu(null)}
        onEditSource={onEditSource}
        onDeleteSource={onDeleteSource}
      />
    </div>
  );
}

export default SourceBar;
