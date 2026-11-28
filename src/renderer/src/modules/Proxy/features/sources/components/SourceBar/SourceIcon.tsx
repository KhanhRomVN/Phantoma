import { cn } from '@renderer/utils/cn';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import type { ProxySource } from '../../../../shared/types/source-domain.types';
import { SOURCE_TYPE } from '../../constants/source.constants';

export function SourceIcon({ source, size, className }: { source: ProxySource; size: number; className?: string }) {
  const Fallback = SOURCE_TYPE[source.type].icon;
  return (
    <Favicon
      url={source.url ? getFaviconUrl(source.url, 64) : undefined}
      size={size}
      className={cn('shrink-0 rounded-sm', className)}
      fallbackIcon={<Fallback className='shrink-0 text-text-secondary' style={{ width: size, height: size }} />}
    />
  );
}
