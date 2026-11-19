import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import { TOTP_SEPARATOR_INDEX } from '../constants/totp';
import type { TotpDisplayProps } from '../types/totp.types';
import { getTotpDigits, getTotpPercent, isTotpLow } from '../utils/totp';

function CopyText({ value, label, className, children }: { value: string; label: string; className?: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Tooltip content={copied ? 'Copied' : label} side="top">
      <button type="button" onClick={handleCopy} className={cn('min-w-0 text-left', className)}>
        {children}
      </button>
    </Tooltip>
  );
}

export function TotpDisplay({ code, remaining }: TotpDisplayProps) {
  const low = isTotpLow(remaining);
  const digits = getTotpDigits(code);
  const percent = getTotpPercent(remaining);

  return (
    <div className="relative overflow-hidden rounded-md bg-background/40">
      <div
        className={cn(
          'pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full opacity-25 blur-2xl transition-colors duration-500',
          low ? 'bg-warn' : 'bg-primary',
        )}
      />
      <div className="relative flex items-center justify-between gap-3 px-3 py-3">
        <CopyText value={code ?? ''} label="Click to copy code" className="overflow-visible">
          <span className="flex items-center gap-1">
            {digits.map((ch, i) => (
              <span key={i} className="flex items-center gap-1">
                {i === TOTP_SEPARATOR_INDEX && (
                  <span className="mx-1 h-0.5 w-2 rounded-full bg-text-secondary/30" />
                )}
                <span
                  className={cn(
                    'flex h-10 w-7 items-center justify-center rounded-md bg-gradient-to-b from-text-secondary/15 to-text-secondary/5 font-mono text-xl font-semibold tabular-nums transition-colors duration-500',
                    low ? 'text-warn' : 'text-text-primary',
                  )}
                  style={low ? { textShadow: '0 0 10px currentColor' } : undefined}
                >
                  {ch}
                </span>
              </span>
            ))}
          </span>
        </CopyText>
        <div className="flex shrink-0 flex-col items-end leading-none">
          <span
            className={cn(
              'text-xl font-semibold tabular-nums transition-colors duration-500',
              low ? 'text-warn' : 'text-text-primary',
            )}
          >
            {remaining}
            <span className="ml-0.5 text-[10px] font-normal text-text-secondary">s</span>
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-text-secondary">
            refresh
          </span>
        </div>
      </div>
      <div className="relative h-[3px] w-full bg-text-secondary/10">
        <div
          style={{ width: `${percent}%` }}
          className={cn(
            'h-full rounded-r-full transition-all duration-1000 ease-linear',
            low ? 'bg-warn' : 'bg-primary',
          )}
        />
      </div>
    </div>
  );
}

export default TotpDisplay;