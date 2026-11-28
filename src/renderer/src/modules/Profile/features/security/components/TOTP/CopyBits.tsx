import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';

function useCopied(value: string): [boolean, () => Promise<void>] {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };
  return [copied, copy];
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, copy] = useCopied(value);
  return (
    <Tooltip content={copied ? 'Copied' : label} side="top">
      <button
        type="button"
        onClick={copy}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </Tooltip>
  );
}

export function CopyText({ value, label, className, children }: { value: string; label: string; className?: string; children: ReactNode }) {
  const [copied, copy] = useCopied(value);
  return (
    <Tooltip content={copied ? 'Copied' : label} side="top">
      <button type="button" onClick={copy} className={cn('min-w-0 text-left', className)}>
        {children}
      </button>
    </Tooltip>
  );
}
