// src/renderer/src/features/Tool/components/IntelPanel/index.tsx
import { useState, useRef, useEffect } from 'react';
import type { SubTarget } from '../../features/Tool/types/types';
import { AgentPanel } from './Agent';
import { Analytic } from './Analytic';
import { Terminal } from './Terminal';
import HomePanel from './Agent/feature/Home';
import SessionPanel from './Agent/feature/Session';
import AccountPanel from './Agent/feature/Account';
import { Analytic as AnalyticFeature } from './Agent/feature/Analytic';
import HistoryPanel from './Agent/feature/History';
import { Models as ModelsFeature } from './Agent/feature/Model';
import SettingsPanel from './Agent/feature/Setting';
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
import { SettingsProvider } from './Agent/context/SettingsContext';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/Dropdown';

type PanelView = 'agent' | 'analytic' | 'terminal';
type AgentSubView =
  | 'home'
  | 'session'
  | 'account'
  | 'analytic-feature'
  | 'history'
  | 'model'
  | 'setting'
  | null;

export function RightPanel({ subTarget: _subTarget }: { subTarget: SubTarget }) {
  const [view, setView] = useState<PanelView>('agent');
  const [agentSubView, setAgentSubView] = useState<AgentSubView>(null);
  const [agentPanelKey, setAgentPanelKey] = useState(0);
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
    { label: 'Account', icon: User, subView: 'account' as AgentSubView },
    { label: 'Model', icon: Cpu, subView: 'model' as AgentSubView },
    { label: 'History', icon: Clock, subView: 'history' as AgentSubView },
    { label: 'Setting', icon: Settings, subView: 'setting' as AgentSubView },
    { label: 'Analytic', icon: BarChart3, subView: 'analytic-feature' as AgentSubView },
  ];

  return (
    <SettingsProvider>
      <div className="w-[450px] shrink-0 border-l border-divider flex flex-col overflow-hidden relative">
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
              <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-background border border-border rounded-lg shadow-xl py-1 z-50">
                {dropdownOptions.map((option) => {
                  const isActive = view === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        setView(option.id);
                        setAgentSubView(null);
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
              <button
                onClick={() => {
                  setAgentSubView(null);
                  setAgentPanelKey((k) => k + 1);
                }}
                className={cn(
                  'p-1 rounded hover:bg-sidebar-item-hover transition-colors',
                  agentSubView === null && 'bg-primary/10 text-primary',
                )}
              >
                <Plus className="w-4 h-4 text-text-secondary" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setAgentSubView('session')}
                  className={cn(
                    'p-1 rounded hover:bg-sidebar-item-hover transition-colors',
                    agentSubView === 'session' && 'bg-primary/10 text-primary',
                  )}
                >
                  <LayoutDashboard className="w-4 h-4 text-text-secondary" />
                </button>
                <span className="absolute -top-1 -right-1 bg-primary/80 text-text-foreground text-[10px] font-medium rounded-md min-w-[18px] h-[18px] flex items-center justify-center ">
                  2
                </span>
              </div>
              <Dropdown>
                <DropdownTrigger>
                  <button className="p-1 rounded hover:bg-sidebar-item-hover transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-text-secondary" />
                  </button>
                </DropdownTrigger>
                <DropdownContent className="min-w-[160px]">
                  {ellipsisOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <DropdownItem
                        key={option.label}
                        icon={<Icon className="w-4 h-4" />}
                        onClick={() => setAgentSubView(option.subView)}
                      >
                        {option.label}
                      </DropdownItem>
                    );
                  })}
                </DropdownContent>
              </Dropdown>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {view === 'agent' && agentSubView === null && <AgentPanel key={agentPanelKey} />}
          {view === 'agent' && (
            <div className={cn('absolute inset-0', agentSubView !== 'home' && 'hidden')}>
              <HomePanel onSendMessage={() => {}} onLoadConversation={() => {}} />
            </div>
          )}
          {view === 'agent' && agentSubView === 'session' && (
            <SessionPanel isOpen={true} onClose={() => setAgentSubView(null)} />
          )}
          {view === 'agent' && agentSubView === 'account' && (
            <AccountPanel isOpen={true} onClose={() => setAgentSubView(null)} />
          )}
          {view === 'agent' && agentSubView === 'analytic-feature' && (
            <AnalyticFeature isOpen={true} onClose={() => setAgentSubView(null)} />
          )}
          {view === 'agent' && agentSubView === 'history' && (
            <HistoryPanel isOpen={true} onClose={() => setAgentSubView(null)} />
          )}
          {view === 'agent' && agentSubView === 'model' && (
            <ModelsFeature isOpen={true} onClose={() => setAgentSubView(null)} />
          )}
          {view === 'agent' && agentSubView === 'setting' && (
            <SettingsPanel isOpen={true} onClose={() => setAgentSubView(null)} />
          )}
          {view === 'analytic' && <Analytic />}
          {view === 'terminal' && <Terminal />}
        </div>
      </div>
    </SettingsProvider>
  );
}
