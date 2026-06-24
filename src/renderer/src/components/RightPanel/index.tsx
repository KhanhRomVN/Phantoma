// src/renderer/src/features/Tool/components/IntelPanel/index.tsx
import { useState, useRef, useEffect } from 'react';
import type { SubTarget } from '../../features/Tool/types/types';
import { AgentPanel } from './Agent';
import { Analytic } from './Analytic';
import { Terminal } from './Terminal';
import { ChevronDown, BarChart3, Bot, Terminal as TerminalIcon } from 'lucide-react';
import { cn } from '../../shared/lib/utils';

type PanelView = 'agent' | 'analytic' | 'terminal';

export function IntelPanel({ subTarget: _subTarget }: { subTarget: SubTarget }) {
  const [view, setView] = useState<PanelView>('agent');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTitle = () => {
    switch (view) {
      case 'agent':
        return 'Agent';
      case 'analytic':
        return 'Analytic';
      case 'terminal':
        return 'Terminal';
      default:
        return 'Panel';
    }
  };

  const getIcon = () => {
    switch (view) {
      case 'agent':
        return <Bot className="w-3.5 h-3.5" />;
      case 'analytic':
        return <BarChart3 className="w-3.5 h-3.5" />;
      case 'terminal':
        return <TerminalIcon className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const dropdownOptions = [
    { id: 'agent' as PanelView, label: 'Agent', icon: Bot },
    { id: 'analytic' as PanelView, label: 'Analytic', icon: BarChart3 },
    { id: 'terminal' as PanelView, label: 'Terminal', icon: TerminalIcon },
  ];

  return (
    <div className="w-[450px] shrink-0 bg-sidebar-background border-l border-divider flex flex-col overflow-hidden">
      {/* Header Bar - height matches Emulate header (h-10) */}
      <div className="h-10 border-b border-divider flex items-center px-3 shrink-0 bg-table-headerBg/30">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 text-xs font-medium text-text-primary hover:text-primary transition-colors cursor-pointer"
          >
            {getIcon()}
            <span>{getTitle()}</span>
            <ChevronDown className={cn(
              'w-3 h-3 text-text-secondary transition-transform',
              isDropdownOpen && 'rotate-180'
            )} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-modal-background border border-border rounded-lg shadow-xl py-1 z-50">
              {dropdownOptions.map((option) => {
                const Icon = option.icon;
                const isActive = view === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      setView(option.id);
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-secondary hover:bg-dropdown-item-hover hover:text-text-primary'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'agent' && <AgentPanel />}
        {view === 'analytic' && <Analytic />}
        {view === 'terminal' && <Terminal />}
      </div>
    </div>
  );
}
