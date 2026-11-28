import type { LucideIcon } from 'lucide-react';

export function Empty({ text, icon: Icon }: { text: string; icon?: LucideIcon }) {
  return (
    <div className='flex flex-col items-center gap-2 py-6 text-center text-xs text-text-secondary'>
      {Icon && (
        <span className='flex h-9 w-9 items-center justify-center rounded-lg bg-text-secondary/10'>
          <Icon className='h-4 w-4' />
        </span>
      )}
      {text}
    </div>
  );
}
