import { useMemo } from 'react';
import { Fingerprint, Sparkles } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
import { MONO_LABELS, SECTION_ICON } from '../../../constants/fingerprint-detail.constants';
import type { FootprintPreset } from '@renderer/services/fingerprint-generator';
import type { ProxyItem } from '../../../../../shared/types';
import { buildFullReport } from '@renderer/services/fingerprint-generator';
import { DetailCard, KV, Metric } from './DetailBits';

export function FootprintDetailPanel({
  preset,
  proxy,
}: {
  preset: FootprintPreset;
  proxy: ProxyItem | null;
}) {
  const sections = useMemo(() => buildFullReport(preset).sections, [preset]);
  const match = proxy !== null && proxy.countryCode === preset.cc;
  const total = sections.reduce((n, s) => n + s.fields.length, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl bg-card-background p-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(90% 120% at 0% 0%, hsl(265 80% 60% / 0.18), transparent 70%)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <span
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              TONE_CLASS.primary.icon,
            )}
          >
            <Fingerprint className="h-6 w-6" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-sm font-semibold text-text-primary">{preset.name}</span>
            <span className="truncate text-[11px] text-text-secondary">
              {preset.screen} · {preset.gpu}
            </span>
          </div>
        </div>
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
              TONE_CLASS[preset.tone].pill,
            )}
          >
            {preset.tag}
          </span>
          <span className="rounded-md bg-text-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
            {preset.os}
          </span>
          <span className="rounded-md bg-text-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
            {preset.browser}
          </span>
          {match && (
            <span
              className={cn(
                'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                TONE_CLASS.success.pill,
              )}
            >
              <Sparkles className="h-3 w-3" />
              Matches proxy region
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Cores" value={String(preset.cores)} tone="success" />
        <Metric label="Memory" value={String(preset.memory)} unit="GB" tone="info" />
        <Metric label="Users" value={String(preset.usage)} unit="%" tone={preset.tone} />
      </div>

      <div className="flex flex-col gap-1.5 rounded-xl bg-card-background px-3 py-2.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-text-secondary">
          <span>Popularity</span>
          <span className="tabular-nums">{total} fields</span>
        </div>
        <span className="h-1.5 overflow-hidden rounded-full bg-text-secondary/15">
          <span
            className={cn('block h-full rounded-full', TONE_CLASS[preset.tone].dot)}
            style={{ width: `${Math.min(100, preset.usage * 2.4)}%` }}
          />
        </span>
      </div>

      {sections.map((s, i) => (
        <DetailCard
          key={s.id}
          title={`${String(i + 1).padStart(2, '0')}. ${s.title}`}
          icon={SECTION_ICON[s.id] ?? Fingerprint}
          tone={s.tone}
          aside={
            <span className="text-[10px] tabular-nums text-text-secondary">{s.fields.length}</span>
          }
        >
          {s.fields.map(({ label, value }) => (
            <KV
              key={label}
              label={label}
              value={value}
              mono={MONO_LABELS.has(label)}
              copy={MONO_LABELS.has(label)}
            />
          ))}
        </DetailCard>
      ))}
    </div>
  );
}

export default FootprintDetailPanel;
