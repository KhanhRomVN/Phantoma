/**
 * ------------------------------------------------------------------
 * RightPanel
 * ------------------------------------------------------------------
 * Panel bên phải của giao diện chính, chứa các view: Agent, Analytic,
 * Terminal. Hỗ trợ chuyển đổi giữa các view và các sub-view của Agent.
 *
 * Main features:
 * - Chuyển đổi giữa các view chính: Agent, Analytic, Terminal
 * - Dropdown chọn view và menu ellipsis cho các sub-view của Agent
 * - Quản lý trạng thái sub-view của Agent (Home, Session, Account, ...)
 * ------------------------------------------------------------------
 */

import { useState, useRef, useEffect } from 'react';

// ── Components ──
import { AgentPanel } from './Agent';
import HomePanel from './Agent/feature/Home';
import AccountPanel from './Agent/feature/Account';
import HistoryPanel from './Agent/feature/History';
import SettingsPanel from './Agent/feature/Setting';

// CONTEXT
import { SettingsProvider } from './Agent/context/SettingsContext';
import { useAgentFeature } from './Agent/context/FeatureContext';

// ── Types ──
import type { SubTarget } from '../../modules/Tool/types/types';

// UI
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/Dropdown';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import {
  ChevronDown,
  BarChart3,
  Terminal as TerminalIcon,
  Plus,
  MoreHorizontal,
  User,
  Clock,
  Settings,
  Bot,
  Gamepad2,
  Code2,
  Radar,
} from 'lucide-react';

// ── Constants ──
const MIN_WIDTH = 300;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 450;

// ─── Types ─────────────────────────────────────────────────────────────────

type PanelView = 'agent' | 'analytic' | 'terminal';
type AgentSubView =
  | 'home'
  | 'session'
  | 'account'
  | 'history'
  | 'setting'
  | null;

// ─── Component ─────────────────────────────────────────────────────────────

export function RightPanel({ subTarget: _subTarget }: { subTarget: SubTarget }) {
  const [view, setView] = useState<PanelView>('agent');
  const [agentSubView, setAgentSubView] = useState<AgentSubView>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef({ startX: 0, startWidth: 0 });
  
  // Get active feature context
  const { activeFeature, emulateState, codeState } = useAgentFeature();

  // Resize handler
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Tính delta: kéo sang trái (âm) = thu nhỏ panel, kéo sang phải (dương) = mở rộng panel
      const delta = resizeStartRef.current.startX - e.clientX;
      const newWidth = resizeStartRef.current.startWidth + delta;
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      setWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = {
      startX: e.clientX,
      startWidth: width,
    };
    setIsResizing(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        // Dropdown will close automatically via Dropdown component
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getViewIcon = (viewId: PanelView) => {
    switch (viewId) {
      case 'agent':
        return Bot;
      case 'analytic':
        return BarChart3;
      case 'terminal':
        return TerminalIcon;
      default:
        return Bot;
    }
  };

  const getViewColor = (viewId: PanelView) => {
    switch (viewId) {
      case 'agent':
        return 'text-primary';
      case 'analytic':
        return 'text-purple-400';
      case 'terminal':
        return 'text-cyan-400';
      default:
        return 'text-primary';
    }
  };

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

  const dropdownOptions = [
    { id: 'agent' as PanelView, label: 'Agent', icon: Bot, color: 'text-primary' },
    {
      id: 'analytic' as PanelView,
      label: 'Analytic',
      icon: BarChart3,
      color: 'text-purple-400',
    },
    {
      id: 'terminal' as PanelView,
      label: 'Terminal',
      icon: TerminalIcon,
      color: 'text-cyan-400',
    },
  ];

  const ellipsisOptions = [
    { label: 'Account', icon: User, subView: 'account' as AgentSubView },
    { label: 'History', icon: Clock, subView: 'history' as AgentSubView },
    { label: 'Setting', icon: Settings, subView: 'setting' as AgentSubView },
  ];

  return (
    <SettingsProvider>
      <div
        ref={panelRef}
        className="shrink-0 border-l border-divider flex flex-col overflow-hidden relative h-full"
        style={{ width: `${width}px` }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group',
            'hover:bg-primary/30 transition-colors',
            isResizing && 'bg-primary/50',
          )}
          style={{ zIndex: 9999 }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-4 -translate-x-1.5" />
        </div>
        {/* Header Bar */}
        <div className="h-10 border-b border-divider flex items-center px-3 shrink-0">
          <Dropdown>
            <DropdownTrigger>
              <button className="flex items-center gap-1.5 text-sm font-medium text-text-primary hover:text-primary transition-colors cursor-pointer">
                {(() => {
                  const Icon = getViewIcon(view);
                  const color = getViewColor(view);
                  return (
                    <>
                      <Icon className={cn('w-4 h-4', color)} />
                      <span>{getTitle()}</span>
                      <ChevronDown className="w-3 h-3 text-text-secondary" />
                    </>
                  );
                })()}
              </button>
            </DropdownTrigger>
            <DropdownContent className="min-w-[160px]">
              {dropdownOptions.map((option) => {
                const Icon = option.icon;
                const isActive = view === option.id;
                return (
                  <DropdownItem
                    key={option.id}
                    icon={<Icon className={cn('w-4 h-4', option.color)} />}
                    onClick={() => {
                      setView(option.id);
                      setAgentSubView(null);
                    }}
                    className={cn(isActive && 'bg-primary/10 text-primary')}
                  >
                    {option.label}
                  </DropdownItem>
                );
              })}
            </DropdownContent>
          </Dropdown>

          {/* Right side icons - only show when Agent is selected */}
          {view === 'agent' && (
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  setAgentSubView(null);
                  // Trigger a custom event to reset AgentView to Home without remounting
                  window.dispatchEvent(new CustomEvent('agent:resetToHome'));
                }}
                className={cn(
                  'p-1 rounded transition-colors',
                  agentSubView === null && ' text-primary',
                )}
              >
                <Plus className="w-4 h-4 text-text-secondary" />
              </button>
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
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {view === 'agent' && (
            <div className={cn('h-full', agentSubView !== null && 'hidden')}>
              <AgentPanel />
            </div>
          )}
          {view === 'agent' && (
            <div className={cn('absolute inset-0', agentSubView !== 'home' && 'hidden')}>
              <HomePanel onSendMessage={() => {}} onLoadConversation={() => {}} />
            </div>
          )}
          {view === 'agent' && agentSubView === 'account' && (
            <AccountPanel isOpen={true} onClose={() => setAgentSubView(null)} />
          )}
          {view === 'agent' && agentSubView === 'history' && (
            <HistoryPanel isOpen={true} onClose={() => setAgentSubView(null)} />
          )}
          {view === 'agent' && agentSubView === 'setting' && (
            <SettingsPanel isOpen={true} onClose={() => setAgentSubView(null)} />
          )}
        </div>

        {/* Footer Bar */}
        <div className="h-8 border-t border-border bg-sidebar-background/80 backdrop-blur-sm px-4 flex items-center justify-between text-[10px] text-text-secondary select-none shrink-0 w-full">
          <div className="flex items-center gap-4 flex-1">
            {/* Emulate Module - Target ID + Session Status */}
            {activeFeature === 'emulate' && emulateState.activeTargetId && (
              <>
                <div className="flex items-center gap-1.5">
                  <Gamepad2 className="w-3 h-3 text-rose-400" strokeWidth={2} />
                  <span className="font-medium text-text-secondary">Target:</span>
                  <span className="font-mono text-primary">{emulateState.activeTargetId}</span>
                </div>
                {emulateState.targetStates[emulateState.activeTargetId]?.isActive && (
                  <div className="flex items-center gap-1.5 text-emerald-400/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-medium">
                      {emulateState.targetStates[emulateState.activeTargetId]?.mode?.toUpperCase() ||
                        'ACTIVE'}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Code Module - Project Path + File Count */}
            {activeFeature === 'code' && codeState.currentProjectId && (
              <div className="flex items-center gap-1.5">
                <Code2 className="w-3 h-3 text-indigo-400" strokeWidth={2} />
                <span className="font-medium text-text-secondary">Workspace:</span>
                <span
                  className="font-mono text-primary truncate max-w-[250px]"
                  title={codeState.currentProjectId}
                >
                  {codeState.currentProjectId.split('/').pop() || codeState.currentProjectId}
                </span>
              </div>
            )}

            {/* Recon Module - Target Email */}
            {activeFeature === 'recon' && (
              <div className="flex items-center gap-1.5">
                <Radar className="w-3 h-3 text-emerald-400" strokeWidth={2} />
                <span className="font-medium text-text-secondary">Module:</span>
                <span className="text-primary">Reconnaissance</span>
              </div>
            )}
          </div>

          {/* Right side - Active Feature Badge */}
          {activeFeature && (
            <div className="flex items-center gap-1.5 opacity-60">
              <span className="text-[9px] uppercase tracking-wider">
                {activeFeature === 'emulate'
                  ? 'Emulation'
                  : activeFeature === 'code'
                    ? 'Code Analysis'
                    : 'Reconnaissance'}
              </span>
            </div>
          )}
        </div>
      </div>
    </SettingsProvider>
  );
}
