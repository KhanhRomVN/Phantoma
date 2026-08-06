import { Square, Send } from 'lucide-react';

// CONSTANT
import { HTTP_METHODS, type HttpMethod } from '../../../../../constants/methods';

// UTIL
import { cn } from '@renderer/shared/utils/cn';

interface RequestBarProps {
  method: string;
  url: string;
  isExecuting: boolean;
  methods: string[];
  isMethodDropdownOpen: boolean;
  methodDropdownRef: React.RefObject<HTMLDivElement | null>;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onToggleDropdown: () => void;
  onSend: () => void;
  readOnly?: boolean;
  hasEmptyPayload?: boolean;
}

export function RequestBar({
  method,
  url,
  isExecuting,
  methods,
  isMethodDropdownOpen,
  methodDropdownRef,
  onMethodChange,
  onUrlChange,
  onToggleDropdown,
  onSend,
  readOnly = false,
  hasEmptyPayload = false,
}: RequestBarProps) {
  const methodColor = HTTP_METHODS[method?.toUpperCase() as HttpMethod]?.color;
  const activeColor = methodColor ? `text-${methodColor}-400` : 'text-text-primary';
  return (
    <div className="flex items-center border-b border-border shrink-0 bg-muted/5">
      <div className="relative shrink-0" ref={methodDropdownRef}>
        <button
          onClick={() => !readOnly && onToggleDropdown()}
          disabled={readOnly}
          className={cn(
            'flex items-center gap-2 h-9 bg-input-background border border-input-border-default px-3 pr-7 text-sm font-mono outline-none hover:border-primary/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
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
        {isMethodDropdownOpen && !readOnly && (
          <div className="absolute top-full left-0 mt-1 min-w-[120px] bg-background border border-border rounded-lg shadow-xl z-50 py-1">
            {methods.map((m) => {
              const mc = HTTP_METHODS[m?.toUpperCase() as HttpMethod]?.color;
              const color = mc ? `text-${mc}-400` : 'text-text-primary';
              return (
                <button
                  key={m}
                  onClick={() => {
                    onMethodChange(m);
                    onToggleDropdown();
                  }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-sm font-mono transition-colors',
                    color,
                    m === method ? 'bg-primary/10' : 'hover:bg-dropdown-item-hover',
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        )}
      </div>

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
