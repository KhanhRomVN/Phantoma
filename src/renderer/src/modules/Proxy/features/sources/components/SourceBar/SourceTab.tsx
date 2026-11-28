import type { MouseEvent, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import type { ProxySource } from '../../../../shared/types/source-domain.types';
import { SOURCE_TYPE } from '../../constants/source.constants';
import { SourceIcon } from './SourceIcon';

export function SourceTab({
  active,
  onClick,
  onContextMenu,
  tip,
  source,
}: {
  active: boolean;
  onClick: () => void;
  onContextMenu?: (e: MouseEvent) => void;
  tip?: ReactNode;
  source: ProxySource;
}) {
  const button = (
    <button
      type='button'
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'relative isolate flex items-center gap-2 whitespace-nowrap rounded-[5px] px-3 py-1.5 text-xs transition-colors',
        active ? 'text-text-primary' : 'text-text-secondary hover:bg-text-secondary/10 hover:text-text-primary',
      )}
    >
      {active && (
        <motion.span
          layoutId='proxy-source-pill'
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className='absolute inset-0 -z-10 rounded-[5px] bg-card-background shadow-sm'
        />
      )}
      <SourceIcon source={source} size={14} />
      <span className='font-medium'>{source.name}</span>
      <span className='flex items-center gap-1 rounded-md bg-text-secondary/15 px-1.5 text-[10px] tabular-nums text-text-secondary'>
        {source.count}
        <span className={cn('h-1.5 w-1.5 rounded-full', SOURCE_TYPE[source.type].dot)} />
      </span>
    </button>
  );
  return tip ? (
    <Tooltip content={tip} side='bottom' contentClassName='max-w-none overflow-hidden rounded-xl p-0'>
      {button}
    </Tooltip>
  ) : (
    button
  );
}
