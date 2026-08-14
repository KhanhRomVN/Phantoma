/**
 * ------------------------------------------------------------------
 * Agent Group Panel
 * ------------------------------------------------------------------
 * Management panel for AI coding agent groups.
 * Allows running multiple agents (Claude Code, Codex, etc.) simultaneously
 * in split terminal layouts.
 *
 * Main features:
 * - Create agent groups with multiple terminals
 * - Choose layout: single, 2-split horizontal/vertical, 4-grid
 * - Configure agent type and command per terminal
 * - Quick launch agent groups
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState } from 'react';

// ── UI ──
import { Plus, Users, Edit2, Trash2, Play, Grid2x2, Columns, Rows } from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../../hooks/useCodeStore';

// ── Types ──
import type { AgentGroup, TerminalLayout, AgentType, AgentConfig } from '../../types/agent-group';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Constants ──────────────────────────────────────────────────────────

const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  'claude-code': {
    type: 'claude-code',
    label: 'Claude Code',
    icon: '🤖',
    defaultCommand: 'claude-code',
    description: 'Anthropic Claude Code CLI',
    color: 'text-purple',
  },
  codex: {
    type: 'codex',
    label: 'Codex',
    icon: '⚡',
    defaultCommand: 'codex',
    description: 'OpenAI Codex CLI',
    color: 'text-green',
  },
  cursor: {
    type: 'cursor',
    label: 'Cursor',
    icon: '✨',
    defaultCommand: 'cursor',
    description: 'Cursor AI CLI',
    color: 'text-blue',
  },
  gemini: {
    type: 'gemini',
    label: 'Gemini',
    icon: '💎',
    defaultCommand: 'gemini-code',
    description: 'Google Gemini Code CLI',
    color: 'text-yellow',
  },
  custom: {
    type: 'custom',
    label: 'Custom',
    icon: '⚙️',
    defaultCommand: '',
    description: 'Custom agent command',
    color: 'text-text-secondary',
  },
};

const LAYOUT_CONFIGS: Record<
  TerminalLayout,
  { label: string; icon: typeof Grid2x2; terminalCount: number }
> = {
  single: { label: '1 Terminal', icon: Grid2x2, terminalCount: 1 },
  'horizontal-2': { label: '2 Horizontal', icon: Rows, terminalCount: 2 },
  'vertical-2': { label: '2 Vertical', icon: Columns, terminalCount: 2 },
  'grid-4': { label: '4 Grid', icon: Grid2x2, terminalCount: 4 },
};

// ─── Component ──────────────────────────────────────────────────────────

export function AgentGroupPanel() {
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const agentGroups = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === currentProjectId);
    return project?.agentGroups ?? [];
  });

  const projectPath = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === currentProjectId);
    return project?.path || '';
  });

  const addAgentGroup = useCodeStore((s) => s.addAgentGroup);
  const updateAgentGroup = useCodeStore((s) => s.updateAgentGroup);
  const removeAgentGroup = useCodeStore((s) => s.removeAgentGroup);
  const openAgentGroup = useCodeStore((s) => s.openAgentGroup);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    layout: TerminalLayout;
    color: string;
  }>({
    name: '',
    description: '',
    layout: 'horizontal-2',
    color: '#667eea',
  });

  const [terminalConfigs, setTerminalConfigs] = useState<
    Array<{ agentType: AgentType; command: string }>
  >([
    { agentType: 'claude-code', command: AGENT_CONFIGS['claude-code'].defaultCommand },
    { agentType: 'codex', command: AGENT_CONFIGS.codex.defaultCommand },
  ]);

  // ── Handlers ──

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({ name: '', description: '', layout: 'horizontal-2', color: '#667eea' });
    setTerminalConfigs([
      { agentType: 'claude-code', command: AGENT_CONFIGS['claude-code'].defaultCommand },
      { agentType: 'codex', command: AGENT_CONFIGS.codex.defaultCommand },
    ]);
  };

  const handleLayoutChange = (layout: TerminalLayout) => {
    setFormData({ ...formData, layout });
    const count = LAYOUT_CONFIGS[layout].terminalCount;

    // Adjust terminal configs to match layout
    if (count > terminalConfigs.length) {
      const newConfigs = [...terminalConfigs];
      while (newConfigs.length < count) {
        newConfigs.push({ agentType: 'custom', command: '' });
      }
      setTerminalConfigs(newConfigs);
    } else if (count < terminalConfigs.length) {
      setTerminalConfigs(terminalConfigs.slice(0, count));
    }
  };

  const handleSave = () => {
    if (!currentProjectId) return;

    const terminals = terminalConfigs.map((config, index) => ({
      id: `terminal_${Date.now()}_${index}`,
      agentType: config.agentType,
      command: config.command,
      workingDir: projectPath,
      isActive: index === 0,
      status: 'idle' as const,
    }));

    const groupData = {
      ...formData,
      terminals,
    };

    if (editingId) {
      updateAgentGroup(currentProjectId, editingId, groupData);
      setEditingId(null);
    } else {
      addAgentGroup(currentProjectId, groupData);
      setIsCreating(false);
    }

    setFormData({ name: '', description: '', layout: 'horizontal-2', color: '#667eea' });
    setTerminalConfigs([
      { agentType: 'claude-code', command: AGENT_CONFIGS['claude-code'].defaultCommand },
      { agentType: 'codex', command: AGENT_CONFIGS.codex.defaultCommand },
    ]);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', description: '', layout: 'horizontal-2', color: '#667eea' });
  };

  const handleEdit = (group: AgentGroup) => {
    setEditingId(group.id);
    setFormData({
      name: group.name,
      description: group.description || '',
      layout: group.layout,
      color: group.color || '#667eea',
    });
    setTerminalConfigs(
      group.terminals.map((t) => ({
        agentType: t.agentType,
        command: t.command,
      })),
    );
  };

  const handleDelete = (groupId: string) => {
    if (!currentProjectId) return;
    if (confirm('Bạn có chắc muốn xóa agent group này?')) {
      removeAgentGroup(currentProjectId, groupId);
    }
  };

  const handleOpen = (groupId: string) => {
    if (!currentProjectId) return;
    openAgentGroup(currentProjectId, groupId);
  };

  // ── Render Form ──

  if (isCreating || editingId) {
    return (
      <div className="flex-1 flex flex-col bg-sidebar-background p-4 gap-4 overflow-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">
            {editingId ? 'Sửa Agent Group' : 'Tạo Agent Group'}
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Tên</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
              placeholder="Tên agent group"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Mô tả</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
              placeholder="Mô tả ngắn gọn"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Layout</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(LAYOUT_CONFIGS).map(([key, config]) => {
                const LayoutIcon = config.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleLayoutChange(key as TerminalLayout)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 border rounded text-xs transition-colors',
                      formData.layout === key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-text-secondary hover:border-primary/50',
                    )}
                  >
                    <LayoutIcon className="w-4 h-4" />
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Terminal Configs */}
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Terminals</label>
            <div className="space-y-2">
              {terminalConfigs.map((config, index) => (
                <div key={index} className="p-3 bg-background border border-border rounded">
                  <div className="text-xs text-text-secondary mb-2">Terminal {index + 1}</div>
                  <select
                    value={config.agentType}
                    onChange={(e) => {
                      const newConfigs = [...terminalConfigs];
                      const agentType = e.target.value as AgentType;
                      newConfigs[index] = {
                        agentType,
                        command: AGENT_CONFIGS[agentType].defaultCommand,
                      };
                      setTerminalConfigs(newConfigs);
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary mb-2"
                  >
                    {Object.entries(AGENT_CONFIGS).map(([key, agentConfig]) => (
                      <option key={key} value={key}>
                        {agentConfig.icon} {agentConfig.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={config.command}
                    onChange={(e) => {
                      const newConfigs = [...terminalConfigs];
                      newConfigs[index].command = e.target.value;
                      setTerminalConfigs(newConfigs);
                    }}
                    placeholder="Command"
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-10 bg-background border border-border rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-auto pt-4">
          <button
            onClick={handleSave}
            disabled={!formData.name.trim()}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {editingId ? 'Cập nhật' : 'Tạo'}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-sidebar-item-hover text-text-secondary rounded text-sm hover:bg-sidebar-item-hover/80 transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  // ── Render List ──

  return (
    <div className="flex-1 flex flex-col bg-sidebar-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">Agent Groups</h3>
        <button
          onClick={handleCreate}
          className="p-1.5 rounded hover:bg-sidebar-item-hover text-text-secondary hover:text-primary transition-colors"
          title="Tạo agent group"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Group List */}
      <div className="flex-1 overflow-auto p-3">
        {agentGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary/40 gap-3">
            <Users className="w-8 h-8" strokeWidth={1} />
            <div className="text-sm">Chưa có agent group</div>
            <button onClick={handleCreate} className="text-xs text-primary hover:underline">
              Tạo agent group đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {agentGroups.map((group) => (
              <AgentGroupCard
                key={group.id}
                group={group}
                onOpen={() => handleOpen(group.id)}
                onEdit={() => handleEdit(group)}
                onDelete={() => handleDelete(group.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agent Group Card ───────────────────────────────────────────────────

interface AgentGroupCardProps {
  group: AgentGroup;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function AgentGroupCard({ group, onOpen, onEdit, onDelete }: AgentGroupCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const layoutConfig = LAYOUT_CONFIGS[group.layout];
  const LayoutIcon = layoutConfig.icon;

  return (
    <div
      className="group relative border border-border rounded-lg p-3 bg-background hover:border-primary/50 transition-colors cursor-pointer"
      style={{ borderLeftColor: group.color, borderLeftWidth: '3px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text-primary line-clamp-1">{group.name}</h4>
          {group.description && (
            <p className="text-xs text-text-secondary/60 line-clamp-1 mt-1">
              {group.description}
            </p>
          )}
        </div>

        {/* Actions */}
        {isHovered && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary hover:text-primary transition-colors"
              title="Sửa"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary hover:text-error transition-colors"
              title="Xóa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Layout & Terminals */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-sidebar-background text-text-secondary">
            <LayoutIcon className="w-3 h-3" />
            <span>{layoutConfig.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {group.terminals.slice(0, 3).map((terminal, index) => {
            const agentConfig = AGENT_CONFIGS[terminal.agentType];
            return (
              <div
                key={index}
                className={cn('text-xs px-1.5 py-0.5 rounded', agentConfig.color)}
                title={agentConfig.label}
              >
                {agentConfig.icon}
              </div>
            );
          })}
          {group.terminals.length > 3 && (
            <div className="text-xs text-text-secondary">+{group.terminals.length - 3}</div>
          )}
        </div>
      </div>

      {/* Launch button on hover */}
      {isHovered && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
            title="Launch"
          >
            <Play className="w-5 h-5" fill="currentColor" />
          </button>
        </div>
      )}
    </div>
  );
}
