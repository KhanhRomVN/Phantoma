import { ClipboardPaste } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Field, INPUT } from '../../../../../shared/components/form';

interface ProxyQuickInputProps {
  value: string;
  error: boolean;
  onChange: (value: string) => void;
  onApply: (text: string) => void;
}

export function ProxyQuickInput({ value, error, onChange, onApply }: ProxyQuickInputProps) {
  return (
    <Field
      label="Quick paste"
      hint={
        error && (
          <span className="text-[11px] text-error">Unrecognized format</span>
        )
      }
    >
      <div className="flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <ClipboardPaste className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
          <input
            value={value}
            spellCheck={false}
            placeholder="socks5://user:pass@host:port  or  host:port:user:pass"
            onChange={(e) => onChange(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              onApply(e.clipboardData.getData('text'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onApply(value);
              }
            }}
            className={cn(INPUT, 'pl-9 font-mono', error && 'bg-error/10')}
          />
        </div>
        <button
          type="button"
          onClick={() => onApply(value)}
          disabled={!value.trim()}
          className="h-9 shrink-0 rounded-md bg-text-secondary/10 px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary disabled:opacity-50"
        >
          Fill
        </button>
      </div>
    </Field>
  );
}
