import { useState } from 'react';
import { CheckCircle2, ChevronDown, ShieldCheck } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { Profile } from '../../../../types';
import { computeSecurity, SECURITY_LEVEL_LABEL } from '../../../../utils/security';
import type { SecurityLevel } from '../../../../utils/security';
import { TONE_CLASS } from '../../../../constants/tone';
import type { Tone } from '../../../../types/ui.types';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionProps {
  title: string;
  icon?: LucideIcon;
  tone?: Tone;
  children: ReactNode;
}

function Section({ title, icon: Icon, tone = 'muted', children }: SectionProps) {
  return (
    <section className="rounded-md bg-card-background">
      <header className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-text-primary">
        {Icon && (
          <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        {title}
      </header>
      <div className="px-3.5 pb-3.5">{children}</div>
    </section>
  );
}

type Severity = 'high' | 'medium' | 'low';

const SEVERITY_ORDER: Severity[] = ['high', 'medium', 'low'];

const SEVERITY_TONE: Record<Severity, Tone> = {
  high: 'error',
  medium: 'warn',
  low: 'info',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const SEVERITY_TEXT: Record<Severity, string> = {
  high: 'text-error',
  medium: 'text-warn',
  low: 'text-info',
};

const TONE_TEXT: Record<Tone, string> = {
  success: 'text-success',
  error: 'text-error',
  warn: 'text-warn',
  info: 'text-info',
  primary: 'text-primary',
  muted: 'text-text-secondary',
};

export const LEVEL_TONE: Record<SecurityLevel, Tone> = {
  critical: 'error',
  weak: 'warn',
  fair: 'info',
  good: 'success',
  strong: 'success',
};

const VISIBLE_ISSUES = 3;
const GAUGE_PATH = 'M10 60 A50 50 0 0 1 110 60';

export function SecurityCard({ profile }: { profile: Profile }) {
  const sec = computeSecurity(profile);
  const tone = LEVEL_TONE[sec.level];
  const [expanded, setExpanded] = useState(false);
  const issues = [...sec.issues].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
  const counts = SEVERITY_ORDER.map((s) => ({
    severity: s,
    count: issues.filter((i) => i.severity === s).length,
  })).filter((c) => c.count > 0);
  const shown = expanded ? issues : issues.slice(0, VISIBLE_ISSUES);
  const hidden = issues.length - shown.length;

  return (
    <Section title="Security" icon={ShieldCheck} tone={tone}>
      <div className="flex items-center gap-4">
        <div className={cn('relative h-[66px] w-[120px] shrink-0', TONE_TEXT[tone])}>
          <svg viewBox="0 0 120 66" className="h-full w-full overflow-visible">
            <path
              d={GAUGE_PATH}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              pathLength={100}
              className="stroke-text-secondary/15"
            />
            <path
              d={GAUGE_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${sec.score} 100`}
              style={{ filter: 'drop-shadow(0 0 5px currentColor)' }}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex items-baseline justify-center gap-0.5 text-text-primary">
            <span className="text-[28px] font-semibold leading-none tabular-nums">{sec.score}</span>
            <span className="text-[10px] text-text-secondary">/100</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('text-sm font-semibold leading-none', TONE_TEXT[tone])}>
              {SECURITY_LEVEL_LABEL[sec.level]}
            </span>
            <span className="text-[11px] text-text-secondary">
              {issues.length === 0
                ? 'No issues'
                : `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}`}
            </span>
          </div>
          <div className="mt-2.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
            {issues.length === 0 ? (
              <span className="h-full flex-1 rounded-full bg-success/60" />
            ) : (
              counts.map((c) => (
                <span
                  key={c.severity}
                  style={{ flexGrow: c.count }}
                  className={cn('h-full rounded-full', TONE_CLASS[SEVERITY_TONE[c.severity]].dot)}
                />
              ))
            )}
          </div>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-text-secondary">
            {counts.map((c) => (
              <span key={c.severity} className="inline-flex items-center gap-1">
                <span className={cn('h-1.5 w-1.5 rounded-full', TONE_CLASS[SEVERITY_TONE[c.severity]].dot)} />
                <span className="tabular-nums text-text-primary">{c.count}</span>
                {SEVERITY_LABEL[c.severity]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-success/10 px-2.5 py-1.5 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          This profile passes every security check.
        </div>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-border/60 border-t border-border/60">
          {shown.map((i) => (
            <div key={i.id} className="animate-in fade-in-0 duration-150 flex items-center gap-2.5 py-1.5 text-xs">
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_CLASS[SEVERITY_TONE[i.severity]].dot)} />
              <span className="min-w-0 flex-1 truncate text-text-primary">{i.label}</span>
              <span className={cn('shrink-0 text-[10px] font-medium uppercase tracking-wider', SEVERITY_TEXT[i.severity])}>
                {SEVERITY_LABEL[i.severity]}
              </span>
            </div>
          ))}
          {issues.length > VISIBLE_ISSUES && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center justify-center gap-1 py-1.5 text-[11px] text-text-secondary transition-colors hover:text-text-primary"
            >
              {expanded ? 'Show less' : `Show ${hidden} more`}
              <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
        </div>
      )}
    </Section>
  );
}

export default SecurityCard;