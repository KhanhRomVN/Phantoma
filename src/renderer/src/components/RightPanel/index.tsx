// src/renderer/src/features/Tool/components/IntelPanel/index.tsx
import { useState, useRef, useEffect } from 'react';
import type { SubTarget } from '../../features/Tool/types/types';
import { AgentPanel } from './Agent';
import { Analytic } from './Analytic';
import { Terminal } from './Terminal';
import {
  ChevronDown,
  BarChart3,
  Bot,
  Terminal as TerminalIcon,
  Plus,
  LayoutDashboard,
  MoreHorizontal,
  User,
  Cpu,
  Clock,
  Settings,
} from 'lucide-react';
import { cn } from '../../shared/lib/utils';

type PanelView = 'agent' | 'analytic' | 'terminal';

export function IntelPanel({ subTarget: _subTarget }: { subTarget: SubTarget }) {
  const [view, setView] = useState<PanelView>('agent');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEllipsisOpen, setIsEllipsisOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const ellipsisRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (ellipsisRef.current && !ellipsisRef.current.contains(e.target as Node)) {
        setIsEllipsisOpen(false);
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
        return <Bot className="w-4 h-4" />;
      case 'analytic':
        return <BarChart3 className="w-4 h-4" />;
      case 'terminal':
        return <TerminalIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const dropdownOptions = [
    { id: 'agent' as PanelView, label: 'Agent' },
    { id: 'analytic' as PanelView, label: 'Analytic', icon: BarChart3 },
    { id: 'terminal' as PanelView, label: 'Terminal', icon: TerminalIcon },
  ];

  const ellipsisOptions = [
    { label: 'Account', icon: User },
    { label: 'Model', icon: Cpu },
    { label: 'History', icon: Clock },
    { label: 'Setting', icon: Settings },
    { label: 'Analytic', icon: BarChart3 },
  ];

  return (
    <div className="w-[450px] shrink-0 border-l border-divider flex flex-col overflow-hidden">
      {/* Header Bar */}
      <div className="h-[37px] border-b border-divider flex items-center px-3 shrink-0">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 text-sm font-medium text-text-primary hover:text-primary transition-colors cursor-pointer"
          >
            <span>{getTitle()}</span>
            <ChevronDown
              className={cn(
                'w-3 h-3 text-text-secondary transition-transform',
                isDropdownOpen && 'rotate-180',
              )}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-modal-background border border-border rounded-lg shadow-xl py-1 z-50">
              {dropdownOptions.map((option) => {
                const isActive = view === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      setView(option.id);
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2/10 px-3 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-secondary hover:bg-dropdown-item-hover hover:text-text-primary',
                    )}
                  >
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side icons - only show when Agent is selected */}
        {view === 'agent' && (
          <div className="ml-auto flex items-center gap-2">
            <button className="p-1 rounded hover:bg-sidebar-item-hover transition-colors">
              <Plus className="w-4 h-4 text-text-secondary" />
            </button>
            <div className="relative">
              <button className="p-1 rounded hover:bg-sidebar-item-hover transition-colors">
                <LayoutDashboard className="w-4 h-4 text-text-secondary" />
              </button>
              <span className="absolute -top-1 -right-1 bg-primary/80 text-text-foreground text-[10px] font-medium rounded-md min-w-[18px] h-[18px] flex items-center justify-center ">
                2
              </span>
            </div>
            <div className="relative" ref={ellipsisRef}>
              <button
                onClick={() => setIsEllipsisOpen(!isEllipsisOpen)}
                className="p-1 rounded hover:bg-sidebar-item-hover transition-colors"
              >
                <MoreHorizontal className="w-4 h-4 text-text-secondary" />
              </button>
              {isEllipsisOpen && (
                <div className="absolute top-full right-0 mt-1 min-w-[160px] bg-modal-background border border-border rounded-lg shadow-xl py-1 z-50">
                  {ellipsisOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.label}
                        onClick={() => {
                          // Placeholder: no functionality yet
                          setIsEllipsisOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-dropdown-item-hover hover:text-text-primary transition-colors"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
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
