import type { ReactNode } from 'react';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';

export function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-md bg-card-background p-3.5">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-text-primary">{title}</div>
          {hint && <div className="mt-0.5 text-[11px] text-text-secondary">{hint}</div>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function ProviderMark({ label, url }: { label: string; url: string }) {
  const fallback = (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-text-secondary/20 text-[9px] font-bold uppercase text-text-secondary">
      {label.charAt(0)}
    </span>
  );
  return <Favicon url={getFaviconUrl(url, 32)} size={16} className="shrink-0 rounded-sm" fallbackIcon={fallback} />;
}
