import { useEffect, useRef } from 'react';
import {
  ArrowUpToLine,
  Bug,
  Check,
  Columns3,
  Filter,
  Network,
  RotateCcw,
  Search,
  Shield,
  Square,
  Target,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';
import { cn } from '@renderer/utils/cn';
import { DEFAULT_COLUMN_VISIBILITY, TOGGLEABLE_COLUMNS, isColumnVisible } from './requestColumns';
import type { ColumnVisibility } from './requestColumns';

export type RequestViewMode = 'https' | 'websocket';

interface RequestToolbarProps {
  viewMode: RequestViewMode;
  onViewModeChange: (mode: RequestViewMode) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  count?: number;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  columnVisibility: ColumnVisibility;
  onColumnVisibilityChange: (visibility: ColumnVisibility) => void;
  onClear: () => void;
  isTargetActive?: boolean;
  activeTargetMode?: 'mitm' | 'cdp' | 'frida' | null;
  onStopTarget?: () => void;
  isInterceptActive?: boolean;
  onToggleIntercept?: () => void;
  onScrollToTop?: () => void;
  onScrollToSelected?: () => void;
  canScrollToSelected?: boolean;
}

const NO_OUTLINE = 'outline-none focus:outline-none focus-visible:outline-none';
const ICON_BTN = cn(
  NO_OUTLINE,
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary',
);
const ICON_BTN_ACTIVE = cn(
  NO_OUTLINE,
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20',
);

const VIEW_MODES: { id: RequestViewMode; label: string }[] = [
  { id: 'https', label: 'HTTPS' },
  { id: 'websocket', label: 'WebSocket' },
];

export function RequestToolbar({
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  isFilterOpen,
  onToggleFilter,
  columnVisibility,
  onColumnVisibilityChange,
  onClear,
  isTargetActive = false,
  activeTargetMode = null,
  onStopTarget,
  isInterceptActive = false,
  onToggleIntercept,
  onScrollToTop,
  onScrollToSelected,
  canScrollToSelected = false,
}: RequestToolbarProps) {
  const isHttps = viewMode === 'https';
  const searchRef = useRef<HTMLInputElement>(null);
  const hiddenCount = TOGGLEABLE_COLUMNS.filter(
    (c) => !isColumnVisible(columnVisibility, c.id),
  ).length;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex items-center gap-2 px-2 py-2 border-b border-border shrink-0">
      <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-text-secondary/10 p-0.5">
        {VIEW_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onViewModeChange(m.id)}
            className={cn(
              NO_OUTLINE,
              'h-7 rounded px-2.5 text-[11px] font-medium transition-colors',
              viewMode === m.id
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:bg-text-secondary/10 hover:text-text-primary',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md bg-input-background px-2.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
        <input
          ref={searchRef}
          type="text"
          placeholder={isHttps ? 'Filter requests...' : 'Filter WebSocket frames...'}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (searchTerm) onSearchChange('');
              else e.currentTarget.blur();
            }
          }}
          className={cn(
            NO_OUTLINE,
            'h-full w-full min-w-0 border-none bg-transparent text-xs text-text-primary ring-0 placeholder:text-text-secondary',
          )}
        />
        {searchTerm ? (
          <button
            onClick={() => onSearchChange('')}
            className={cn(
              NO_OUTLINE,
              'shrink-0 text-text-secondary transition-colors hover:text-text-primary',
            )}
            title="Clear search (Esc)"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {isTargetActive && (
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-md border border-dashed px-2 text-[11px] font-medium',
              activeTargetMode === 'cdp'
                ? 'border-blue-400/50 bg-blue-400/10 text-blue-400'
                : activeTargetMode === 'frida'
                  ? 'border-purple-400/50 bg-purple-400/10 text-purple-400'
                  : 'border-amber-400/50 bg-amber-400/10 text-amber-400',
            )}
          >
            {activeTargetMode === 'cdp' ? (
              <Bug className="h-3.5 w-3.5" />
            ) : activeTargetMode === 'frida' ? (
              <Zap className="h-3.5 w-3.5" />
            ) : (
              <Network className="h-3.5 w-3.5" />
            )}
            {activeTargetMode ? activeTargetMode.toUpperCase() : 'Active'}
          </span>
          {onToggleIntercept && activeTargetMode !== 'cdp' && (
            <button
              onClick={onToggleIntercept}
              className={isInterceptActive ? ICON_BTN_ACTIVE : ICON_BTN}
              title={isInterceptActive ? 'Intercept: on' : 'Intercept: off'}
              aria-label="Toggle intercept"
            >
              <Shield className="h-3.5 w-3.5" />
            </button>
          )}
          {onStopTarget && (
            <button
              onClick={onStopTarget}
              className={cn(
                NO_OUTLINE,
                'flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-error/10 px-2.5 text-[11px] font-medium text-error transition-colors hover:bg-error/20',
              )}
              title="Stop target"
              aria-label="Stop target"
            >
              <Square className="h-3 w-3" />
              Stop
            </button>
          )}
        </div>
      )}

      {isHttps && (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onScrollToTop}
            className={ICON_BTN}
            title="Scroll to top"
            aria-label="Scroll to top"
          >
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onScrollToSelected}
            disabled={!canScrollToSelected}
            className={cn(ICON_BTN, 'disabled:cursor-not-allowed disabled:opacity-40')}
            title="Scroll to focused request"
            aria-label="Scroll to focused request"
          >
            <Target className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onToggleFilter}
            className={isFilterOpen ? ICON_BTN_ACTIVE : ICON_BTN}
            title="Filter"
            aria-label="Filter"
          >
            <Filter className="h-3.5 w-3.5" />
          </button>

          <Dropdown align="end" closeOnSelect={false} width={190}>
            <DropdownTrigger asChild>
              <button className={ICON_BTN} title="Columns" aria-label="Columns">
                <Columns3 className="h-3.5 w-3.5" />
              </button>
            </DropdownTrigger>
            <DropdownContent>
              <div className="flex items-center justify-between px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                <span>Columns</span>
                {hiddenCount > 0 && <span className="normal-case">{hiddenCount} hidden</span>}
              </div>
              {TOGGLEABLE_COLUMNS.map((col) => {
                const visible = isColumnVisible(columnVisibility, col.id);
                return (
                  <DropdownItem
                    key={col.id}
                    onClick={() =>
                      onColumnVisibilityChange({ ...columnVisibility, [col.id]: !visible })
                    }
                  >
                    <span className={cn('flex-1', !visible && 'text-text-secondary')}>
                      {col.label}
                    </span>
                    {visible && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownItem>
                );
              })}
              <DropdownSeparator />
              <DropdownItem
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={() => onColumnVisibilityChange(DEFAULT_COLUMN_VISIBILITY)}
              >
                Reset to default
              </DropdownItem>
            </DropdownContent>
          </Dropdown>

          <button
            onClick={onClear}
            className={cn(
              NO_OUTLINE,
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-error/10 hover:text-error',
            )}
            title="Clear all HTTPS requests"
            aria-label="Clear all HTTPS requests"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default RequestToolbar;