import { Activity, Check, Gauge, Globe, MapPin, Plug, Plus, Shield, Wifi, Zap } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { TONE_CLASS } from '../../../../constants/tone';
import { CANCEL_BTN } from '../../FormBits';
import { MAX_PING, PING_STEPS, PROXY_HEALTH, PROXY_KIND, PROXY_PROTOCOLS } from '../../../../constants/proxy';
import { useProxyPicker } from '../../../../hooks/useProxyPicker';
import type { ProxyHealth, ProxyItem, ProxyKind } from '../../../../types';
import { flagEmoji } from '../../../../utils/proxy';
import { CountryBadges } from './CountryBadges';
import { Chip, EmptyResult, FilterButton, FilterPanel, FilterSection, SearchInput, Tag } from './PickerBits';
import { ProxyCustomForm } from './ProxyCustomForm';

interface ProxyPickerProps {
  value: ProxyItem | null;
  onChange: (p: ProxyItem | null) => void;
}

export function ProxyPicker({ value, onChange }: ProxyPickerProps) {
  const s = useProxyPicker(value, onChange);

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-2'>
        <SearchInput value={s.q} onChange={s.setQ} placeholder='Search host, city, provider…  try  country:vn  type:socks5  ping<100' />
        <FilterButton open={s.panel} count={s.activeFilters} onClick={s.togglePanel} />
        <button
          type='button'
          onClick={s.toggleAdding}
          title='Custom proxy'
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
            s.adding ? 'bg-primary/10 text-primary' : 'bg-background text-text-secondary hover:bg-text-secondary/10 hover:text-text-primary',
          )}
        >
          <Plus className='h-3.5 w-3.5' />
        </button>
      </div>

      {s.panel && (
        <FilterPanel count={s.activeFilters} tags={s.tags} onReset={s.reset}>
          <FilterSection icon={Plug} label='Protocol'>
            {PROXY_PROTOCOLS.map((p) => (
              <Chip key={p} active={s.filters.protocols.includes(p)} onClick={() => s.toggleProtocol(p)}>
                {p}
              </Chip>
            ))}
          </FilterSection>
          <FilterSection icon={Shield} label='IP type'>
            {(Object.keys(PROXY_KIND) as ProxyKind[]).map((k) => (
              <Chip key={k} active={s.filters.kinds.includes(k)} onClick={() => s.toggleKind(k)}>
                {PROXY_KIND[k].label}
              </Chip>
            ))}
          </FilterSection>
          <FilterSection icon={Activity} label='Status'>
            <Chip active={s.filters.health === 'all'} onClick={() => s.setHealth('all')}>
              All
            </Chip>
            {(Object.keys(PROXY_HEALTH) as ProxyHealth[]).map((h) => (
              <Chip key={h} active={s.filters.health === h} onClick={() => s.setHealth(h)}>
                {PROXY_HEALTH[h].label}
              </Chip>
            ))}
          </FilterSection>
          <FilterSection icon={Gauge} label='Max latency'>
            <Chip active={s.filters.maxPing === MAX_PING} onClick={() => s.setMaxPing(MAX_PING)}>
              Any
            </Chip>
            {PING_STEPS.map((v) => (
              <Chip key={v} active={s.filters.maxPing === v} onClick={() => s.setMaxPing(v)}>
                {v} ms
              </Chip>
            ))}
          </FilterSection>
          <FilterSection icon={MapPin} label='Country' hint={`${s.countries.length} regions`} className='col-span-2'>
            <CountryBadges countries={s.countries} value={s.filters.country} onToggle={s.toggleCountry} />
          </FilterSection>
        </FilterPanel>
      )}

      {s.adding && (
        <ProxyCustomForm draft={s.draft} onChange={s.setDraft} valid={s.draftValid} onCancel={s.closeAdding} onAdd={s.addCustom} />
      )}

      <div className='flex max-h-[300px] flex-col gap-1.5 overflow-y-auto pr-0.5'>
        <button
          type='button'
          onClick={() => onChange(null)}
          className={cn(
            'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
            value === null ? 'border-dashed border-primary bg-primary/5' : 'border-transparent bg-background/60 hover:bg-text-secondary/10',
          )}
        >
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONE_CLASS.muted.icon)}>
            <Globe className='h-4 w-4' />
          </span>
          <span className='flex min-w-0 flex-1 flex-col'>
            <span className='text-xs font-medium text-text-primary'>Direct connection</span>
            <span className='text-[10px] text-text-secondary'>Use this machine's own IP, no proxy</span>
          </span>
          {value === null && <Check className='h-3.5 w-3.5 shrink-0 text-primary' />}
        </button>

        {s.list.length === 0 && <EmptyResult text='No proxy matches your search.' onReset={s.reset} />}

        {s.list.map((p) => {
          const active = value?.id === p.id;
          const kind = PROXY_KIND[p.kind];
          const health = PROXY_HEALTH[p.health];
          const measured = p.latency > 0;
          const place = [p.city, p.countryCode.toUpperCase()].filter(Boolean).join(', ');
          const line2 = `${p.protocol.toLowerCase()}://${p.host}:${p.port} · ${place} · ${p.provider}`;
          return (
            <button
              key={p.id}
              type='button'
              onClick={() => onChange(p)}
              className={cn(
                'grid grid-cols-[32px_minmax(0,1fr)_84px] items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                active ? 'border-dashed border-primary bg-primary/5' : 'border-transparent bg-background/60 hover:bg-text-secondary/10',
                p.health === 'offline' && !active && 'opacity-60',
              )}
            >
              <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-text-secondary/10 text-base leading-none'>
                {flagEmoji(p.countryCode)}
              </span>
              <span className='flex min-w-0 flex-col gap-0.5'>
                <span className='flex min-w-0 items-center gap-1.5'>
                  <span className='min-w-0 truncate text-xs font-medium text-text-primary'>{p.name}</span>
                  {p.custom && <Tag tone='primary'>Custom</Tag>}
                  <Tag tone='muted'>{p.protocol}</Tag>
                  <Tag tone={kind.tone}>{kind.label}</Tag>
                </span>
                <span title={line2} className='truncate font-mono text-[10px] text-text-secondary'>
                  {line2}
                </span>
              </span>
              <span className='flex flex-col items-end gap-0.5 text-[10px] tabular-nums'>
                <span className='flex items-center gap-1.5 text-text-primary'>
                  <span className={cn('h-1.5 w-1.5 rounded-full', TONE_CLASS[health.tone].dot)} />
                  {measured ? `${p.latency} ms` : p.health === 'offline' ? 'Offline' : '—'}
                </span>
                <span className='text-text-secondary'>{p.uptime > 0 ? `${p.uptime}% up` : '—'}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className='flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2'>
        <span className='flex min-w-0 items-center gap-2 text-[11px]'>
          <Wifi className={cn('h-3.5 w-3.5 shrink-0', s.test === 'ok' ? 'text-success' : s.test === 'fail' ? 'text-error' : 'text-text-secondary')} />
          <span className={cn('truncate', s.test === 'ok' ? 'text-success' : s.test === 'fail' ? 'text-error' : 'text-text-secondary')}>
            {value ? `${value.host}:${value.port} · ${s.testText}` : 'Direct connection · nothing to test'}
          </span>
        </span>
        <Button className={cn('h-8 rounded-md', CANCEL_BTN)} disabled={!value || s.test === 'testing'} onClick={s.runTest}>
          <Zap className='h-3.5 w-3.5' />
          Test proxy
        </Button>
      </div>
    </div>
  );
}

export default ProxyPicker;