import { useState } from 'react';
import { Check, Inbox, Search, SearchX } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
import type { ProxySource } from '../../../../../shared/types/source-domain.types';
import { SOURCE_TYPE } from '../../../../sources';

interface ProxySourceSelectorProps {
  sources: ProxySource[];
  value: string;
  onChange: (id: string) => void;
}

function SourceCard({ source, active, onClick }: { source: ProxySource; active: boolean; onClick: () => void }) {
  const Fallback = SOURCE_TYPE[source.type].icon;
  const status = source.online ? TONE_CLASS.success : TONE_CLASS.muted;
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors',
        active ? 'bg-primary/10' : 'bg-card-background hover:bg-text-secondary/10',
      )}
    >
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary/15' : 'bg-text-secondary/15')}>
        <Favicon
          url={source.url ? getFaviconUrl(source.url, 64) : undefined}
          size={18}
          className='shrink-0 rounded-sm'
          fallbackIcon={<Fallback className='h-[18px] w-[18px] shrink-0 text-text-secondary' />}
        />
      </span>
      <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <span className={cn('truncate text-xs font-semibold', active ? 'text-primary' : 'text-text-primary')}>{source.name}</span>
        <span className='flex items-center gap-1.5 text-[10px] text-text-secondary'>
          <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
          <span className='tabular-nums'>{source.count} proxies</span>
        </span>
      </span>
      <Check className={cn('h-3.5 w-3.5 shrink-0 text-primary transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
    </button>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Inbox; text: string }) {
  return (
    <div className='flex flex-col items-center gap-2 rounded-xl bg-card-background px-3 py-8 text-center'>
      <Icon className='h-5 w-5 text-text-secondary' />
      <span className='text-[11px] leading-relaxed text-text-secondary'>{text}</span>
    </div>
  );
}

export function ProxySourceSelector({ sources, value, onChange }: ProxySourceSelectorProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = q ? sources.filter((s) => s.name.toLowerCase().includes(q)) : sources;
  return (
    <div className='flex min-w-0 flex-col gap-2'>
      <div className='relative'>
        <Search className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary' />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search sources…'
          spellCheck={false}
          className='h-9 w-full rounded-md bg-text-secondary/10 pl-9 pr-3 text-xs text-text-primary outline-none transition-colors placeholder:text-text-secondary/70 focus:bg-text-secondary/15'
        />
      </div>
      {sources.length === 0 ? (
        <EmptyState icon={Inbox} text='No sources yet. Add a source first.' />
      ) : visible.length === 0 ? (
        <EmptyState icon={SearchX} text='No source matches your search.' />
      ) : (
        visible.map((s) => <SourceCard key={s.id} source={s} active={s.id === value} onClick={() => onChange(s.id)} />)
      )}
    </div>
  );
}

export default ProxySourceSelector;