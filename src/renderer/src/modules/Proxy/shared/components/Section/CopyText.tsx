import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { toastService } from '@renderer/components/ui/Toast';

export function CopyText({ value, display, mono = true }: { value: string; display?: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => toastService.show({ variant: 'error', title: 'Cannot copy to clipboard' }));
  };
  return (
    <button
      type='button'
      onClick={copy}
      title='Click to copy'
      className={cn('inline-flex max-w-full items-center gap-1.5 truncate transition-colors hover:text-primary', mono && 'font-mono')}
    >
      <span className='truncate'>{copied ? 'Copied' : (display ?? value)}</span>
      {copied && <Check className='h-3 w-3 shrink-0 text-success' />}
    </button>
  );
}