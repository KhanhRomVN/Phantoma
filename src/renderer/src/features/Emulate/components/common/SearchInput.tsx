import React from 'react';
import { Search, CaseSensitive, Type, Regex } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  matchCase?: boolean;
  onMatchCaseChange?: (value: boolean) => void;
  matchWholeWord?: boolean;
  onMatchWholeWordChange?: (value: boolean) => void;
  useRegex?: boolean;
  onUseRegexChange?: (value: boolean) => void;
  showButtons?: boolean;
  buttonPosition?: 'inside' | 'outside';
  className?: string;
  inputClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  matchCase = false,
  onMatchCaseChange,
  matchWholeWord = false,
  onMatchWholeWordChange,
  useRegex = false,
  onUseRegexChange,
  showButtons = true,
  buttonPosition = 'outside',
  className = '',
  inputClassName = '',
}) => {
  const hasButtons = showButtons && (onMatchCaseChange || onMatchWholeWordChange || onUseRegexChange);

  const renderButtons = () => (
    <div className="flex items-center gap-0.5">
      {onMatchCaseChange && (
        <button
          onClick={() => onMatchCaseChange(!matchCase)}
          className={cn(
            'p-1 rounded transition-colors',
            matchCase
              ? 'bg-primary/20 text-primary hover:bg-primary/30'
              : 'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
          )}
          title="Match case"
        >
          <CaseSensitive className="w-3.5 h-3.5" />
        </button>
      )}
      {onMatchWholeWordChange && (
        <button
          onClick={() => onMatchWholeWordChange(!matchWholeWord)}
          className={cn(
            'p-1 rounded transition-colors',
            matchWholeWord
              ? 'bg-primary/20 text-primary hover:bg-primary/30'
              : 'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
          )}
          title="Match whole word"
        >
          <Type className="w-3.5 h-3.5" />
        </button>
      )}
      {onUseRegexChange && (
        <button
          onClick={() => onUseRegexChange(!useRegex)}
          className={cn(
            'p-1 rounded transition-colors',
            useRegex
              ? 'bg-success/20 text-success hover:bg-success/30'
              : 'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
          )}
          title="Use regular expression"
        >
          <Regex className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  if (buttonPosition === 'inside' && hasButtons) {
    return (
      <div className={cn('relative flex-1 min-w-[150px]', className)}>
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full pl-8 pr-16 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary',
            inputClassName,
          )}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {renderButtons()}
        </div>
      </div>
    );
  }

  // Default: buttons outside (like RequestTable style)
  return (
    <div className={cn('flex items-center gap-2 flex-1', className)}>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full h-9 bg-input-background border border-input-border-default rounded-md pl-8 pr-3 text-sm text-text-primary focus:border-primary/50 outline-none',
            inputClassName,
          )}
        />
      </div>
      {hasButtons && renderButtons()}
    </div>
  );
};

export default SearchInput;