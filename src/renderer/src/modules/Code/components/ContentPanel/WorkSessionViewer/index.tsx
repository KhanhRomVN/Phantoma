/**
 * ------------------------------------------------------------------
 * Work Session Viewer
 * ------------------------------------------------------------------
 * Component for displaying multiple terminal sessions in split layouts.
 * Supports dynamic zone management with better UX.
 *
 * Main features:
 * - Add/remove zones dynamically (max 4 zones)
 * - Select CLI command for each zone
 * - Split terminal views based on layout
 * - Terminal selection and focus
 * - Command execution interface
 * - Status indicators per terminal
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect } from 'react';

// ── UI ──
import { Play, Square, RotateCw, Plus, X } from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../../../hooks/useCodeStore';

// ── Types ──
import type { AgentGroup, AgentTerminal, AgentType } from '../../../types/agent-group';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Constants ──────────────────────────────────────────────────

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

// Available CLI commands
const AVAILABLE_COMMANDS = [
  { id: 'npm-dev', label: 'npm run dev', command: 'npm run dev', icon: '📦' },
  { id: 'npm-build', label: 'npm run build', command: 'npm run build', icon: '🔨' },
  { id: 'npm-test', label: 'npm test', command: 'npm test', icon: '🧪' },
  { id: 'yarn-dev', label: 'yarn dev', command: 'yarn dev', icon: '🧶' },
  { id: 'pnpm-dev', label: 'pnpm dev', command: 'pnpm dev', icon: '⚡' },
  { id: 'python', label: 'python main.py', command: 'python main.py', icon: '🐍' },
  { id: 'node', label: 'node index.js', command: 'node index.js', icon: '🟢' },
  { id: 'custom', label: 'Custom Command', command: '', icon: '⚙️' },
];

// ─── Component ──────────────────────────────────────────────────

interface WorkSessionViewerProps {
  agentGroup: AgentGroup;
}

export function WorkSessionViewer({ agentGroup }: WorkSessionViewerProps) {
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const updateTerminalInGroup = useCodeStore((s) => s.updateTerminalInGroup);

  const [zones, setZones] = useState<AgentTerminal[]>(agentGroup.terminals || []);
  const [activeZoneId, setActiveZoneId] = useState<string>(zones[0]?.id || '');
  const [isAddingZone, setIsAddingZone] = useState(false);

  // Auto-select first zone on mount
  useEffect(() => {
    if (zones.length > 0 && !activeZoneId) {
      setActiveZoneId(zones[0].id);
    }
  }, [zones, activeZoneId]);

  const handleAddZone = () => {
    if (zones.length >= 4) {
      alert('Tối đa 4 zones!');
      return;
    }
    setIsAddingZone(true);
  };

  const handleConfirmAddZone = (commandId: string, customCommand?: string) => {
    const selectedCmd = AVAILABLE_COMMANDS.find((c) => c.id === commandId);
    if (!selectedCmd) return;

    const newZone: AgentTerminal = {
      id: `zone-${Date.now()}`,
      agentType: 'custom',
      command: customCommand || selectedCmd.command,
      workingDir: '.',
      isActive: false,
      status: 'idle',
    };

    setZones([...zones, newZone]);
    setActiveZoneId(newZone.id);
    setIsAddingZone(false);
  };

  const handleRemoveZone = (zoneId: string) => {
    if (zones.length === 1) {
      alert('Phải có ít nhất 1 zone!');
      return;
    }

    const newZones = zones.filter((z) => z.id !== zoneId);
    setZones(newZones);

    if (activeZoneId === zoneId && newZones.length > 0) {
      setActiveZoneId(newZones[0].id);
    }
  };

  const handleUpdateZone = (zoneId: string, updates: Partial<AgentTerminal>) => {
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, ...updates } : z)),
    );

    if (currentProjectId) {
      updateTerminalInGroup(currentProjectId, agentGroup.id, zoneId, updates);
    }
  };

  const getLayoutClass = () => {
    switch (zones.length) {
      case 1:
        return 'grid-cols-1 grid-rows-1';
      case 2:
        return 'grid-cols-2 grid-rows-1';
      case 3:
        return 'grid-cols-2 grid-rows-2';
      case 4:
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span>{zones.length} zones</span>
            <span className="w-1 h-1 rounded-full bg-text-secondary/30" />
            <span>max 4</span>
          </div>

          <button
            onClick={handleAddZone}
            disabled={zones.length >= 4}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Add new zone"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Zone</span>
          </button>
        </div>
      </div>

      {/* Add Zone Modal */}
      {isAddingZone && (
        <AddZoneModal
          onConfirm={handleConfirmAddZone}
          onCancel={() => setIsAddingZone(false)}
        />
      )}

      {/* Terminal Grid */}
      <div className={cn('flex-1 grid gap-1 p-1 bg-[#1a1b1e]', getLayoutClass())}>
        {zones.map((zone, index) => (
          <TerminalView
            key={zone.id}
            terminal={zone}
            zoneNumber={index + 1}
            isActive={zone.id === activeZoneId}
            showRemove={zones.length > 1}
            onSelect={() => setActiveZoneId(zone.id)}
            onUpdate={(updates) => handleUpdateZone(zone.id, updates)}
            onRemove={() => handleRemoveZone(zone.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Add Zone Modal ─────────────────────────────────────────────

interface AddZoneModalProps {
  onConfirm: (commandId: string, customCommand?: string) => void;
  onCancel: () => void;
}

function AddZoneModal({ onConfirm, onCancel }: AddZoneModalProps) {
  const [selectedCommandId, setSelectedCommandId] = useState<string>('npm-dev');
  const [customCommand, setCustomCommand] = useState('');

  const handleConfirm = () => {
    if (selectedCommandId === 'custom' && !customCommand.trim()) {
      alert('Vui lòng nhập custom command!');
      return;
    }
    onConfirm(selectedCommandId, selectedCommandId === 'custom' ? customCommand : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-sidebar-background border border-border rounded-lg shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Thêm Zone Mới</h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded hover:bg-sidebar-item-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Chọn CLI Command
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_COMMANDS.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => setSelectedCommandId(cmd.id)}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-lg border-2 transition-all text-left',
                    selectedCommandId === cmd.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 bg-background',
                  )}
                >
                  <span className="text-xl">{cmd.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'text-sm font-medium truncate',
                        selectedCommandId === cmd.id ? 'text-primary' : 'text-text-primary',
                      )}
                    >
                      {cmd.label}
                    </div>
                    {cmd.command && (
                      <div className="text-xs text-text-secondary/60 font-mono truncate">
                        {cmd.command}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedCommandId === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Custom Command
              </label>
              <input
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm text-text-primary font-mono placeholder:text-text-secondary/40 focus:outline-none focus:border-primary transition-colors"
                placeholder="Nhập command của bạn..."
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border bg-sidebar-background">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-sidebar-item-hover text-text-secondary rounded text-sm font-medium hover:bg-sidebar-item-hover/80 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Thêm Zone
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Terminal View ──────────────────────────────────────────────

interface TerminalViewProps {
  terminal: AgentTerminal;
  zoneNumber: number;
  isActive: boolean;
  showRemove: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<AgentTerminal>) => void;
  onRemove: () => void;
}

function TerminalView({
  terminal,
  zoneNumber,
  isActive,
  showRemove,
  onSelect,
  onUpdate,
  onRemove,
}: TerminalViewProps) {
  const [output, setOutput] = useState<string[]>([
    `$ ${terminal.command}`,
    'Terminal ready. Click Run to start.',
    '',
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const agentColor = AGENT_COLORS[terminal.agentType];
  const agentLabel = AGENT_LABELS[terminal.agentType];

  const handleRun = () => {
    setIsRunning(true);
    onUpdate({ status: 'running' });

    setOutput((prev) => [
      ...prev,
      `Starting ${agentLabel}...`,
      `Working directory: ${terminal.workingDir}`,
      `Command: ${terminal.command}`,
      '',
      'Process initialized successfully.',
      'Running...',
      '',
    ]);

    // In real implementation: start actual process via IPC
  };

  const handleStop = () => {
    setIsRunning(false);
    onUpdate({ status: 'idle' });
    setOutput((prev) => [...prev, '', 'Process stopped.', '']);
  };

  const handleRestart = () => {
    setOutput([`$ ${terminal.command}`, 'Terminal ready. Click Run to start.', '']);
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
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-text-secondary">Zone {zoneNumber}</span>
            <span className={cn('w-2 h-2 rounded-full', getStatusColor())} />
          </div>
          <span className="text-xs">•</span>
          <span className="text-xs font-medium truncate max-w-[150px]" title={terminal.command}>
            {terminal.command}
          </span>
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

          {showRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Xóa Zone ${zoneNumber}?`)) {
                  onRemove();
                }
              }}
              className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary hover:text-error transition-colors"
              title="Remove zone"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
        {isActive && <div className="inline-block w-2 h-4 bg-green-400 animate-pulse" />}
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
