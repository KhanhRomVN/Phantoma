import { Square, Send } from 'lucide-react';

// ── UI Components ──
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '@renderer/components/ui/Dropdown';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

interface RequestBarProps {
  method: string;
  url: string;
  isExecuting: boolean;
  methods: string[];
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  readOnly?: boolean;
  hasEmptyPayload?: boolean;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-blue-400',
  PUT: 'text-amber-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
  HEAD: 'text-indigo-400',
  OPTIONS: 'text-teal-400',
  TRACE: 'text-pink-400',
  CONNECT: 'text-violet-400',
};

export function RequestBar({
  method,
  url,
  isExecuting,
  methods,
  onMethodChange,
  onUrlChange,
  onSend,
  readOnly = false,
  hasEmptyPayload = false,
}: RequestBarProps) {
  const activeColor = METHOD_COLORS[method?.toUpperCase()] || 'text-text-primary';
  
  return (
    <div className="flex items-center border-b border-border shrink-0 bg-muted/5">
      <Dropdown strategy="fixed" align="start">
        <DropdownTrigger asChild>
          <button
            disabled={readOnly}
            className={cn(
              'flex items-center gap-2 h-9 bg-input-background border border-input-border-default px-3 pr-7 text-sm font-mono outline-none hover:border-primary/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed relative',
              activeColor,
            )}
          >
            {method}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>
        </DropdownTrigger>
        <DropdownContent className="min-w-[120px]">
          {methods.map((m) => {
            const color = METHOD_COLORS[m?.toUpperCase()] || 'text-text-primary';
            return (
              <DropdownItem
                key={m}
                onClick={() => onMethodChange(m)}
                className={cn('font-mono', color, m === method && 'bg-primary/10')}
              >
                {m}
              </DropdownItem>
            );
          })}
        </DropdownContent>
      </Dropdown>

      <input
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        readOnly={readOnly}
        placeholder="Enter URL..."
        className="flex-1 h-9 bg-input-background border border-input-border-default px-3 text-sm font-mono read-only:opacity-60"
      />

      <button
        onClick={onSend}
        disabled={isExecuting || !url || readOnly || hasEmptyPayload}
        title={hasEmptyPayload ? 'Some enabled payloads have no values' : undefined}
        className={cn(
          'flex items-center gap-1.5 px-4 h-9 text-sm font-medium transition-all shrink-0',
          isExecuting || !url || readOnly || hasEmptyPayload
            ? 'bg-error/20 text-error cursor-not-allowed'
            : 'bg-primary/20 text-primary hover:bg-primary/30',
        )}
      >
        {isExecuting ? (
          <>
            <Square className="w-4 h-4" /> Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> Send
          </>
        )}
      </button>
    </div>
  );
}
