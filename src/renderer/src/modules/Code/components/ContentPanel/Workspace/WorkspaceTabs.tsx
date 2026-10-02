/**
 * Tab + TabBar components. Each pane in the grid renders its own TabBar.
 */

import { useState, type DragEvent, type MouseEvent, type ReactNode } from 'react';
import { X, Plus, Terminal as TerminalIcon, Globe, FileText, MonitorPlay } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { getAgentFavicon } from '../../../constants/workspaceAgents';
import type { PanelType, WorkspacePanel } from '../../../utils/workspaceLayout';

// ─── Panel metadata ───────────────────────────────────────────────────

export function getPanelMeta(
  type: PanelType,
  iconClass = 'w-3.5 h-3.5',
): { icon: ReactNode; label: string } {
  switch (type) {
    case 'terminal':
      return { icon: <TerminalIcon className={iconClass} />, label: 'Terminal' };
    case 'website':
      return { icon: <Globe className={iconClass} />, label: 'Browser' };
    case 'note':
      return { icon: <FileText className={iconClass} />, label: 'Markdown' };
    case 'emulator':
      return { icon: <MonitorPlay className={iconClass} />, label: 'Emulator' };
    default:
      return { icon: null, label: 'Unknown' };
  }
}

/** Panel types offered by the "+" dropdown. */
const ADD_MENU_TYPES: PanelType[] = ['terminal', 'website', 'note'];

// ─── Tab ──────────────────────────────────────────────────────────────

/** Agent favicon when a provider is detected, otherwise the default panel icon. */
function TabIcon({ panel }: { panel: WorkspacePanel }) {
  const [failed, setFailed] = useState(false);
  const faviconUrl = failed ? undefined : getAgentFavicon(panel.providerId);

  if (!faviconUrl) return <>{getPanelMeta(panel.type).icon}</>;
  return (
    <img
      src={faviconUrl}
      alt=""
      className="w-3.5 h-3.5 object-contain rounded-sm"
      onError={() => setFailed(true)}
    />
  );
}

interface WorkspaceTabProps {
  panel: WorkspacePanel;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
  onDragStart: (e: DragEvent, id: string) => void;
  onDragEnd: () => void;
}

function WorkspaceTab({ panel, isActive, onClick, onClose, onDragStart, onDragEnd }: WorkspaceTabProps) {
  const displayTitle = panel.title || getPanelMeta(panel.type).label;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, panel.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors',
        'min-w-[100px] max-w-[180px]',
        isActive
          ? 'bg-card-hover text-text-primary border-b-2 border-primary'
          : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02] border-b-2 border-transparent',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center w-3.5 h-3.5 shrink-0',
          isActive ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary',
        )}
      >
        <TabIcon key={panel.providerId ?? 'none'} panel={panel} />
      </span>

      <span className="text-sm font-medium truncate flex-1">{displayTitle}</span>

      {/* Close button on hover for ALL tabs (active or not) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="ml-auto p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/20 text-current z-10"
        aria-label={`Close ${displayTitle}`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────

export interface TabBarProps {
  /** Panels of this pane, already in tab order. */
  panels: WorkspacePanel[];
  activeId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onDragStart: (e: DragEvent, id: string) => void;
  onDragEnd: () => void;
  onAddPanel: (type: PanelType) => void;
}

export function TabBar({
  panels,
  activeId,
  onSelectTab,
  onCloseTab,
  onDragStart,
  onDragEnd,
  onAddPanel,
}: TabBarProps) {
  // Menu position is captured when opened (null = closed)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
    if (menuPos) return setMenuPos(null);
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
  };

  return (
    <div className="h-9 w-full shrink-0 flex items-end bg-sidebar-background overflow-x-auto custom-scrollbar border-b border-divider">
      {panels.map((panel) => (
        <WorkspaceTab
          key={panel.id}
          panel={panel}
          isActive={activeId === panel.id}
          onClick={() => onSelectTab(panel.id)}
          onClose={() => onCloseTab(panel.id)}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}

      <button
        onClick={openMenu}
        className="h-9 w-9 flex items-center justify-center hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors shrink-0"
        aria-label="Add panel"
      >
        <Plus className="w-4 h-4" />
      </button>

      {menuPos && (
        <div className="fixed inset-0 z-[200]" onClick={() => setMenuPos(null)}>
          <div
            className="absolute bg-card-background border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
            style={menuPos}
            onClick={(e) => e.stopPropagation()}
          >
            {ADD_MENU_TYPES.map((type) => {
              const meta = getPanelMeta(type, 'w-4 h-4');
              return (
                <button
                  key={type}
                  onClick={() => {
                    onAddPanel(type);
                    setMenuPos(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-white/[0.05] transition-colors"
                >
                  {meta.icon}
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
