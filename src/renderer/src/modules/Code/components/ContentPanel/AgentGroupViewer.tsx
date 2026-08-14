/**
 * ------------------------------------------------------------------
 * Agent Group Viewer
 * ------------------------------------------------------------------
 * Component for displaying multiple terminal sessions in split layouts.
 * Supports 1, 2 (horizontal/vertical), and 4-grid terminal layouts.
 *
 * Main features:
 * - Split terminal views based on layout
 * - Terminal selection and focus
 * - Agent type indicators
 * - Command execution interface
 * - Status indicators per terminal
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect } from 'react';

// ── UI ──
import { Terminal as TerminalIcon, Play, Square, RotateCw, Maximize2 } from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../../hooks/useCodeStore';

// ── Types ──
import type { AgentGroup, AgentTerminal, AgentType } from '../../types/agent-group';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Constants ──────────────────────────────────────────────────────────

const AGENT_COLORS: Record<AgentType, string> = {
  'claude-code': 'border-purple text-purple',
  codex: 'border-green text-green',
  cursor: 'border-blue text-blue',
  gemini: 'border-yellow text-yellow',
  custom: 'border-text-secondary text-text-secondary',
};

const AGENT_LABELS: Record<AgentType, string> = {
  'claude-code': '🤖 Claude Code',
  codex: '⚡ Codex',
  cursor: '✨ Cursor',
  gemini: '💎 Gemini',
  custom: '⚙️ Custom',
};

// ─── Component ──────────────────────────────────────────────────────────

interface AgentGroupViewerProps {
  agentGroup: AgentGroup;
}

export function AgentGroupViewer({ agentGroup }: AgentGroupViewerProps) {
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const updateTerminalInGroup = useCodeStore((s) => s.updateTerminalInGroup);

  const [activeTerminalId, setActiveTerminalId] = useState<string>(
    agentGroup.terminals[0]?.id || '',
  );

  // Auto-select first terminal on mount
  useEffect(() => {
    if (agentGroup.terminals.length > 0 && !activeTerminalId) {
      setActiveTerminalId(agentGroup.terminals[0].id);
    }
  }, [agentGroup.terminals, activeTerminalId]);

  const handleTerminalUpdate = (terminalId: string, updates: Partial<AgentTerminal>) => {
    if (!currentProjectId) return;
    updateTerminalInGroup(currentProjectId, agentGroup.id, terminalId, updates);
  };

  const getLayoutClass = () => {
    switch (agentGroup.layout) {
      case 'single':
        return 'grid-cols-1 grid-rows-1';
      case 'horizontal-2':
        return 'grid-cols-1 grid-rows-2';
      case 'vertical-2':
        return 'grid-cols-2 grid-rows-1';
      case 'grid-4':
        return 'grid-cols-2 grid-rows-2';
      default:
        return 'grid-cols-1 grid-rows-1';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-sidebar-background">
        <div className="flex items-center gap-3">
          <div
            className="w-1 h-6 rounded"
            style={{ backgroundColor: agentGroup.color || '#667eea' }}
          />
          <div>
            <h3 className="text-sm font-medium text-text-primary">{agentGroup.name}</h3>
            {agentGroup.description && (
              <p className="text-xs text-text-secondary/60">{agentGroup.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>{agentGroup.terminals.length} terminals</span>
          <span className="w-1 h-1 rounded-full bg-text-secondary/30" />
          <span>{agentGroup.layout.replace('-', ' ')}</span>
        </div>
      </div>

      {/* Terminal Grid */}
      <div className={cn('flex-1 grid gap-1 p-1 bg-[#1a1b1e]', getLayoutClass())}>
        {agentGroup.terminals.map((terminal) => (
          <TerminalView
            key={terminal.id}
            terminal={terminal}
            isActive={terminal.id === activeTerminalId}
            onSelect={() => setActiveTerminalId(terminal.id)}
            onUpdate={(updates) => handleTerminalUpdate(terminal.id, updates)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Terminal View ──────────────────────────────────────────────────────

interface TerminalViewProps {
  terminal: AgentTerminal;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<AgentTerminal>) => void;
}

function TerminalView({ terminal, isActive, onSelect, onUpdate }: TerminalViewProps) {
  const [output, setOutput] = useState<string[]>([
    `$ ${terminal.command}`,
    'Terminal ready. Click Run to start the agent.',
    '',
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const agentColor = AGENT_COLORS[terminal.agentType];
  const agentLabel = AGENT_LABELS[terminal.agentType];

  const handleRun = () => {
    setIsRunning(true);
    onUpdate({ status: 'running' });

    // Simulate agent starting
    setOutput((prev) => [
      ...prev,
      `Starting ${agentLabel}...`,
      `Working directory: ${terminal.workingDir}`,
      `Command: ${terminal.command}`,
      '',
      'Agent initialized successfully.',
      'Waiting for instructions...',
      '',
    ]);

    // In a real implementation, this would:
    // 1. Start a real terminal process via IPC
    // 2. Stream output from the process
    // 3. Handle stdin/stdout/stderr
  };

  const handleStop = () => {
    setIsRunning(false);
    onUpdate({ status: 'idle' });
    setOutput((prev) => [...prev, '', 'Agent stopped.', '']);
  };

  const handleRestart = () => {
    setOutput([`$ ${terminal.command}`, 'Terminal ready. Click Run to start the agent.', '']);
    setIsRunning(false);
    onUpdate({ status: 'idle' });
  };

  const getStatusColor = () => {
    switch (terminal.status) {
      case 'running':
        return 'bg-success';
      case 'error':
        return 'bg-error';
      case 'idle':
      default:
        return 'bg-text-secondary/30';
    }
  };

  return (
    <div
      className={cn(
        'relative flex flex-col bg-[#0d1117] rounded overflow-hidden border-2 transition-colors',
        isActive ? 'border-primary' : 'border-transparent',
        'hover:border-primary/50',
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 border-b',
          agentColor,
          'bg-[#161b22]',
        )}
      >
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4" />
          <span className="text-xs font-medium">{agentLabel}</span>
          <span className={cn('w-2 h-2 rounded-full', getStatusColor())} />
        </div>

        <div className="flex items-center gap-1">
          {!isRunning ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRun();
              }}
              className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary hover:text-success transition-colors"
              title="Run"
            >
              <Play className="w-3.5 h-3.5" fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStop();
              }}
              className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary hover:text-error transition-colors"
              title="Stop"
            >
              <Square className="w-3.5 h-3.5" fill="currentColor" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRestart();
            }}
            className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary hover:text-primary transition-colors"
            title="Restart"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-auto p-3 font-mono text-xs text-green-400 leading-relaxed">
        {output.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap">
            {line || '\u00A0'}
          </div>
        ))}

        {/* Cursor */}
        {isActive && (
          <div className="inline-block w-2 h-4 bg-green-400 animate-pulse" />
        )}
      </div>

      {/* Command Info */}
      <div className="px-3 py-2 border-t border-border bg-[#161b22]">
        <div className="text-xs text-text-secondary/60 font-mono truncate">
          {terminal.workingDir}
        </div>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
      )}
    </div>
  );
}
