import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { useAgentTabs } from '@renderer/components/Widgets/Zen/context/AgentTabsContext';

const DEFAULT_TAB_COLOR = 'var(--vscode-charts-purple, #a855f7)';

const AgentTabBar: React.FC = () => {
  const control = useAgentTabs();
  if (!control || control.tabs.length < 2) return null;

  return (
    <div className="-mx-4 -mt-2 mb-1 h-9 flex items-end overflow-x-auto bg-panel-background border-b border-border">
      {control.tabs.map((tab) => {
        const active = tab.id === control.activeId;
        const disabled = tab.disabled ?? false;
        const color = tab.color ?? DEFAULT_TAB_COLOR;
        return (
          <div
            key={tab.id}
            title={disabled ? `${tab.label} (waiting for first message)` : tab.label}
            onClick={() => !disabled && control.onSelect(tab.id)}
            className={cn(
              'group relative h-9 px-3 flex items-center gap-2 shrink-0 text-[12px] border-r border-border transition-colors select-none',
              disabled
                ? 'cursor-not-allowed opacity-40 text-text-secondary'
                : 'cursor-pointer',
              !disabled &&
                (active
                  ? 'bg-primary/15 text-text-primary font-medium'
                  : 'bg-panel-background text-text-secondary hover:bg-white/[0.03] hover:text-text-primary'),
            )}
          >

            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: disabled ? 'transparent' : color,
                border: disabled ? `1px solid ${color}` : 'none',
              }}
            />
            <span className="max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">
              {tab.label}
            </span>
            {tab.closable && control.onClose && (
              <button
                title="Close agent"
                onClick={(e) => {
                  e.stopPropagation();
                  control.onClose?.(tab.id);
                }}
                className="w-5 h-5 p-0 flex items-center justify-center rounded border-0 outline-none cursor-pointer bg-transparent text-text-secondary opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AgentTabBar;