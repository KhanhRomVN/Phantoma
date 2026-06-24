import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';

export interface ComboboxOption {
  id: string;
  label: string;
  value: string;
  metadata?: Record<string, unknown>;
}

interface ComboboxProps<T extends ComboboxOption = ComboboxOption> {
  options: T[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  inputClassName?: string;
  renderOption?: (option: T) => React.ReactNode;
  renderSelected?: (option: T) => React.ReactNode;
  filterFn?: (option: T, searchTerm: string) => boolean;
  allowCustom?: boolean;
  onCustomValue?: (value: string) => void;
}

export function Combobox<T extends ComboboxOption = ComboboxOption>({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className,
  inputClassName,
  renderOption,
  renderSelected,
  filterFn,
  allowCustom = false,
  onCustomValue,
}: ComboboxProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;

    const term = searchTerm.toLowerCase();
    if (filterFn) {
      return options.filter((opt) => filterFn(opt, term));
    }

    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.value.toLowerCase().includes(term) ||
        opt.id.toLowerCase().includes(term),
    );
  }, [options, searchTerm, filterFn]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value || opt.id === value),
    [options, value],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: T) => {
    onChange(option.value || option.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
    if (e.key === 'Enter' && allowCustom && searchTerm.trim()) {
      onCustomValue?.(searchTerm.trim());
      setSearchTerm('');
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <input
          type="text"
          value={
            isOpen
              ? searchTerm
              : selectedOption
                ? renderSelected
                  ? (renderSelected(selectedOption) as string)
                  : selectedOption.label
                : ''
          }
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full bg-input-background border border-input-border-default rounded-lg px-3 py-2 pr-8 text-sm text-text-primary outline-none focus:border-primary/50',
            inputClassName,
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-0.5 rounded hover:bg-muted"
            >
              <X className="w-3.5 h-3.5 text-text-secondary" />
            </button>
          )}
          <button onClick={() => setIsOpen(!isOpen)} className="p-0.5 rounded hover:bg-muted">
            <ChevronDown
              className={cn(
                'w-4 h-4 text-text-secondary transition-transform',
                isOpen && 'rotate-180',
              )}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-modal-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-secondary">
              {allowCustom ? (
                <button
                  onClick={() => {
                    onCustomValue?.(searchTerm.trim());
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                  className="w-full text-left text-primary hover:underline"
                >
                  Create "{searchTerm}"
                </button>
              ) : (
                'No matching options'
              )}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                className={cn(
                  'w-full text-left px-3 py-2 hover:bg-dropdown-item-hover transition-colors border-b border-border/50 last:border-0 text-xs',
                  (option.value === value || option.id === value) && 'bg-primary/10 text-primary',
                )}
              >
                {renderOption ? renderOption(option) : option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Combobox;