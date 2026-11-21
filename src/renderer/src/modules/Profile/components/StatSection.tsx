import { useEffect, useMemo, useRef } from 'react';
import { animate } from 'framer-motion';
import { Ban, CloudOff, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { Profile } from '../types';
import { computeSecurity } from '../utils/security';
import { TONE_CLASS } from '../constants/tone';
import type { Tone } from '../types/ui.types';

interface StatSectionProps {
  profiles: Profile[];
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone: Tone;
}

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.textContent = String(prev.current);
    const controls = animate(prev.current, value, {
      duration: 0.4,
      ease: 'easeOut',
      onUpdate: (v) => {
        node.textContent = String(Math.round(v));
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);
  return <span ref={ref} />;
}

function StatCard({ icon: Icon, label, value, tone }: StatCardProps) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 flex flex-1 items-center gap-3 rounded-md bg-card-background px-3.5 py-2.5 text-left">
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md',
          TONE_CLASS[tone].icon,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-base font-semibold leading-tight text-text-primary tabular-nums">
          {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
        </div>
        <div className="truncate text-[11px] text-text-secondary">{label}</div>
      </div>
    </div>
  );
}

export function StatSection({ profiles }: StatSectionProps) {
  const stats = useMemo(() => {
    const scores = profiles.map((p) => computeSecurity(p).score);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return {
      total: profiles.length,
      avg,
      lowSecurity: scores.filter((s) => s < 60).length,
      unsynced: profiles.filter((p) => p.chromeSync !== 'synced').length,
      bannedServices: profiles.filter((p) => p.services.some((s) => s.status === 'banned')).length,
    };
  }, [profiles]);

  return (
    <div className="flex gap-2.5">
      <StatCard icon={Users} label="Total profiles" value={stats.total} tone="muted" />
      <StatCard icon={ShieldCheck} label="Avg. security score" value={stats.avg} tone="success" />
      <StatCard icon={ShieldAlert} label="Low security (<60)" value={stats.lowSecurity} tone="warn" />
      <StatCard icon={CloudOff} label="Not synced to Chrome" value={stats.unsynced} tone="info" />
      <StatCard icon={Ban} label="Banned services" value={stats.bannedServices} tone="error" />
    </div>
  );
}

export default StatSection;