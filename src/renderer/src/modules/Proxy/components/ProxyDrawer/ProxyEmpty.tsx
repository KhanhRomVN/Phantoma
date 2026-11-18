import { Activity, CheckSquare, Filter, Network, Plus, Search, Upload } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../constants/proxy';
import type { Tone } from '../../types';

interface ProxyEmptyProps {
  onAdd?: () => void;
  onImport?: () => void;
}

const SOFT_BTN =
  'flex h-8 items-center gap-1.5 rounded-md bg-text-secondary/10 px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary active:bg-text-secondary/20';

const TIPS: { icon: LucideIcon; tone: Tone; title: string; text: string }[] = [
  { icon: Search, tone: 'info', title: 'Inspect a proxy', text: 'Click any row to see connection details, usage and history.' },
  { icon: Activity, tone: 'success', title: 'Test connection', text: 'Check latency and exit IP for one proxy or the whole list.' },
  { icon: Filter, tone: 'warn', title: 'Narrow the list', text: 'Filter by status, protocol, type or country above the table.' },
  { icon: CheckSquare, tone: 'primary', title: 'Bulk actions', text: 'Tick several rows to test or delete them together.' },
];

export function ProxyEmpty({ onAdd, onImport }: ProxyEmptyProps) {
  return (
    <div className='flex h-full flex-col items-center justify-center gap-6 px-8 text-center'>
      <div className='flex flex-col items-center gap-3'>
        <span className='flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-border bg-text-secondary/10 text-text-secondary'>
          <Network className='h-8 w-8' />
        </span>
        <div className='flex flex-col gap-1'>
          <span className='text-base font-semibold text-text-primary'>No proxy selected</span>
          <span className='text-xs text-text-secondary'>Pick a proxy from the table to see its details here.</span>
        </div>
      </div>

      <div className='flex w-full max-w-[400px] flex-col gap-2 text-left'>
        {TIPS.map(({ icon: Icon, tone, title, text }, index) => (
          <div
            key={title}
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
            className='animate-in fade-in-0 slide-in-from-bottom-1 duration-300 flex items-start gap-3 rounded-md bg-text-secondary/10 px-3 py-2.5'
          >
            <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
              <Icon className='h-4 w-4' />
            </span>
            <div className='flex flex-col gap-0.5'>
              <span className='text-xs font-medium text-text-primary'>{title}</span>
              <span className='text-[11px] leading-snug text-text-secondary'>{text}</span>
            </div>
          </div>
        ))}
      </div>

      {onAdd && onImport && (
        <div className='flex items-center gap-2'>
          <button type='button' className={SOFT_BTN} onClick={onAdd}>
            <Plus className='h-3.5 w-3.5' />
            Add proxy
          </button>
          <button type='button' className={SOFT_BTN} onClick={onImport}>
            <Upload className='h-3.5 w-3.5' />
            Import
          </button>
        </div>
      )}
    </div>
  );
}

export default ProxyEmpty;