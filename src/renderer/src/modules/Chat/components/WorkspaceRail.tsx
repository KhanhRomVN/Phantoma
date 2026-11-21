import { useState } from 'react';
import { CheckCheck, Layers, LayoutGrid, Plus, Settings, Trash2, UserPlus } from 'lucide-react';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import phantomaLogo from '../../../../../../images/phantoma-logo.png';
import { AV_TONES, TONE } from '../constants';
import type { RailItem, RailMode } from '../types';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import { IconBtn, Logo } from './ui/Primitives';

export type RailAction = 'read' | 'account' | 'delete';

interface WorkspaceRailProps {
  items: RailItem[];
  mode: RailMode;
  onModeChange: (mode: RailMode) => void;
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onItemAction: (action: RailAction, id: string) => void;
}

interface MenuState {
  id: string;
  top: number;
  left: number;
}

export function WorkspaceRail({
  items,
  mode,
  onModeChange,
  activeId,
  onSelect,
  onAdd,
  onItemAction,
}: WorkspaceRailProps) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuItem = menu ? items.find((w) => w.id === menu.id) : undefined;
  return (
    <div
      className="flex flex-col items-center shrink-0 bg-background border-r border-border"
      style={{ width: 58 }}
    >
      <div className="h-[52px] w-full shrink-0 flex items-center justify-center bg-panel-background border-b border-border">
        <Tooltip content="Chat Hub · E2EE secured" side="right">
          <img
            src={phantomaLogo}
            alt="Phantoma"
            width={32}
            height={32}
            className="w-8 h-8 rounded-xl object-contain"
          />
        </Tooltip>
      </div>
      <div className="flex flex-col items-center gap-2 py-3 flex-1 min-h-0 w-full">
      <IconBtn
        icon={mode === 'group' ? Layers : LayoutGrid}
        tip={mode === 'group' ? 'Viewing by group · switch to services' : 'Viewing by service · switch to groups'}
        side="right"
        onClick={() => onModeChange(mode === 'group' ? 'service' : 'group')}
        active
      />
      <div className="w-6 h-px my-1 bg-border" />
      <div
        className="ch-scroll flex flex-col items-center gap-2 overflow-y-auto flex-1 w-full"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((w, i) => {
          const Icon = w.icon;
          const act = w.id === activeId;
          const t = TONE[AV_TONES[i % AV_TONES.length]];
          return (
            <Tooltip
              key={w.id}
              side="right"
              content={
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="font-medium text-text-primary">{w.name}</span>
                  <span className="text-text-secondary">
                    {w.unread > 0 ? `${w.unread} unread` : 'No unread messages'}
                  </span>
                </div>
              }
            >
              <button
                onClick={() => onSelect(w.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ id: w.id, top: e.clientY, left: e.clientX });
                }}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${t.text} ${
                  act ? t.soft : 'bg-card-background ch-hv'
                }`}
              >
                {act && (
                  <span className={`absolute -left-[9px] top-2 bottom-2 w-[3px] rounded-r ${t.bg}`} />
                )}
                {w.platform ? <Logo platform={w.platform} size={20} /> : Icon && <Icon size={18} />}
                {w.unread > 0 && (
                  <span className="absolute bottom-0 right-0 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-error text-text-foreground">
                    {w.unread > 99 ? '99+' : w.unread}
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })}
      </div>
      <IconBtn
        icon={Plus}
        tip={mode === 'group' ? 'Add group' : 'Add service'}
        side="right"
        onClick={onAdd}
      />
      <IconBtn icon={Settings} tip="Security settings" side="right" />

      <Dropdown
        className="absolute"
        open={menu !== null}
        onOpenChange={(o) => {
          if (!o) setMenu(null);
        }}
        strategy="fixed"
        position={menu ? { top: menu.top, left: menu.left } : undefined}
        width={200}
      >
        <DropdownTrigger asChild>
          <span className="block h-0 w-0" />
        </DropdownTrigger>
        <DropdownContent>
          {menuItem && (
            <>
              <DropdownItem
                icon={<CheckCheck className="h-3.5 w-3.5" />}
                onClick={() => onItemAction('read', menuItem.id)}
              >
                Mark as read
              </DropdownItem>
              <DropdownItem
                icon={<UserPlus className="h-3.5 w-3.5" />}
                onClick={() => onItemAction('account', menuItem.id)}
              >
                Add account
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                variant="error"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => onItemAction('delete', menuItem.id)}
              >
                {mode === 'group' ? 'Delete group' : 'Remove service'}
              </DropdownItem>
            </>
          )}
        </DropdownContent>
      </Dropdown>
      </div>
    </div>
  );
}