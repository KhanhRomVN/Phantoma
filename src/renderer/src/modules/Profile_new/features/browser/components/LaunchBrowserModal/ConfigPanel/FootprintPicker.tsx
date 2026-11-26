import { useEffect } from 'react';
import { Check, Cpu, Globe, Languages, MapPin, Monitor, Sparkles } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
import { OS_FAMILIES } from '../../../constants/footprint.constants';
import { useFootprintPicker } from '../../../hooks/useFootprintPicker';
import type { FootprintPreset } from '@renderer/services/fingerprint-generator';
import type { ProxyItem } from '../../../../../shared/types';
import { Chip, EmptyResult, FilterButton, FilterPanel, FilterSection, SearchInput, Tag } from './PickerBits';

interface FootprintPickerProps {
  value: FootprintPreset | null;
  onChange: (p: FootprintPreset | null) => void;
  proxy: ProxyItem | null;
}

export function FootprintPicker({ value, onChange, proxy }: FootprintPickerProps) {
  const s = useFootprintPicker(proxy);

  useEffect(() => {
    if (!s.generated || value === null || s.source.some((p) => p.id === value.id)) return;
    if (s.source[0]) onChange(s.source[0]);
  }, [s.generated, s.source, value, onChange]);

  const ipLine =
    s.lookupStatus === 'loading'
      ? 'Analyzing IP fields…'
      : s.info
        ? `Generated from ${s.info.ip} · ${[s.info.city, s.info.countryCode].filter(Boolean).join(', ')} · ${s.info.timezone}`
        : 'IP lookup failed — showing generic presets';

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-2'>
        <SearchInput value={s.q} onChange={s.setQ} placeholder='Search OS, GPU, language…  try  os:mac  browser:chrome  lang:vi' />
        <FilterButton open={s.panel} count={s.activeFilters} onClick={s.togglePanel} />
      </div>
      <span className='truncate px-0.5 text-[10px] text-text-secondary'>{ipLine}</span>

      {s.panel && (
        <FilterPanel count={s.activeFilters} tags={s.tags} onReset={s.reset}>
          <FilterSection icon={Monitor} label='Operating system'>
            {OS_FAMILIES.map((f) => (
              <Chip key={f.id} active={s.families.includes(f.id)} onClick={() => s.toggleFamily(f.id)}>
                {f.label}
              </Chip>
            ))}
          </FilterSection>
          <FilterSection icon={Globe} label='Browser'>
            <Chip active={s.browser === 'all'} onClick={() => s.setBrowser('all')}>
              All
            </Chip>
            {s.browsers.map((b) => (
              <Chip key={b} active={s.browser === b} onClick={() => s.setBrowser(b)}>
                {b}
              </Chip>
            ))}
          </FilterSection>
          <FilterSection icon={Languages} label='Language'>
            <Chip active={s.lang === 'all'} onClick={() => s.setLang('all')}>
              All
            </Chip>
            {s.langs.map((l) => (
              <Chip key={l} active={s.lang === l} onClick={() => s.setLang(l)}>
                {l}
              </Chip>
            ))}
          </FilterSection>
          {!s.generated && (
            <FilterSection icon={MapPin} label='Proxy region'>
              <Chip active={s.matchOnly} disabled={!s.regionCode} onClick={s.toggleMatchOnly}>
                {s.regionCode ? `Only matching ${s.regionCode}` : 'Select a proxy first'}
              </Chip>
            </FilterSection>
          )}
        </FilterPanel>
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
            <Cpu className='h-4 w-4' />
          </span>
          <span className='flex min-w-0 flex-1 flex-col'>
            <span className='text-xs font-medium text-text-primary'>System footprint</span>
            <span className='text-[10px] text-text-secondary'>Use this machine's real fingerprint, no changes</span>
          </span>
          {value === null && <Check className='h-3.5 w-3.5 shrink-0 text-primary' />}
        </button>

        {s.list.length === 0 ? (
          <EmptyResult text='No footprint matches your search.' onReset={s.reset} />
        ) : (
          s.list.map((p) => {
            const active = value !== null && p.id === value.id;
            const line2 = `${p.os} · ${p.browser} · ${p.screen} · ${p.gpu} · ${p.cores} cores · ${p.memory} GB · ${p.lang} · ${p.tz}`;
            const score = p.trust ?? Math.min(100, p.usage * 2.4);
            return (
              <button
                key={p.id}
                type='button'
                title={p.reasons?.join('\n')}
                onClick={() => onChange(p)}
                className={cn(
                  'grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                  active ? 'border-dashed border-primary bg-primary/5' : 'border-transparent bg-background/60 hover:bg-text-secondary/10',
                )}
              >
                <span className='flex min-w-0 flex-col gap-0.5'>
                  <span className='flex min-w-0 items-center gap-1.5'>
                    <span className='min-w-0 truncate text-xs font-medium text-text-primary'>{p.name}</span>
                    {!s.generated && s.matches(p) && <Sparkles className='h-3 w-3 shrink-0 text-success' />}
                    <Tag tone={p.tone}>{p.tag}</Tag>
                  </span>
                  <span title={line2} className='truncate text-[10px] text-text-secondary'>
                    {line2}
                  </span>
                </span>
                <span className='flex flex-col items-end gap-1'>
                  <span className='flex items-center gap-1 text-[10px] tabular-nums text-text-secondary'>
                    {active && <Check className='h-3 w-3 shrink-0 text-primary' />}
                    {p.trust !== undefined ? `Trust ${p.trust}` : `${p.usage}% users`}
                  </span>
                  <span className='h-1 w-full overflow-hidden rounded-full bg-text-secondary/15'>
                    <span className={cn('block h-full rounded-full', TONE_CLASS[p.tone].dot)} style={{ width: `${score}%` }} />
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default FootprintPicker;