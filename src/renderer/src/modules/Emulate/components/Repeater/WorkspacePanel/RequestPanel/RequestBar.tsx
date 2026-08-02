import { Square, Send } from 'lucide-react';
import { cn } from '../../../../../../shared/lib/utils';
import { useAccentColors } from '../../../../../../shared/hooks/useAccentColors';

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
}: RequestBarProps) {
  const { getColorByIndex } = useAccentColors();

  return (
    <div className="flex items-center border-b border-border shrink-0 bg-muted/5">
      <div className="relative shrink-0" ref={methodDropdownRef}>
        <button
          onClick={onToggleDropdown}
          className="flex items-center gap-2 h-9 bg-input-background border border-input-border-default px-3 pr-7 text-sm font-mono outline-none hover:border-primary/50 transition-colors"
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
        {isMethodDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 min-w-[120px] bg-background border border-border rounded-lg shadow-xl z-50 py-1">
            {methods.map((m, index) => {
              const color = getColorByIndex(index % 10);
              return (
                <button
                  key={m}
                  onClick={() => {
                    onMethodChange(m);
                    onToggleDropdown();
                  }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-sm font-mono transition-colors',
                    m === method ? 'bg-primary/10' : 'hover:bg-dropdown-item-hover',
                  )}
                  style={m === method ? { color: color } : undefined}
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
        placeholder="Enter URL..."
        className="flex-1 h-9 bg-input-background border border-input-border-default px-3 text-sm font-mono"
      />

      <button
        onClick={onSend}
        disabled={isExecuting || !url}
        className={cn(
          'flex items-center gap-1.5 px-4 h-9 text-sm font-medium transition-all shrink-0',
          isExecuting || !url
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