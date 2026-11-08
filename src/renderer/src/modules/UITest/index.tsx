import React, { useState } from 'react';
import {
  Home,
  ChevronRight,
  MousePointerClick,
  Tag,
  Keyboard,
  CheckSquare,
  TextCursorInput,
  Layers,
  PanelRight,
  Menu,
  MessageSquare,
  Table as TableIcon,
  Calendar as CalendarIcon,
  PanelLeft,
} from 'lucide-react';
import ButtonTab from './Button';
import {
  BadgeDemo,
  KbdDemo,
  CheckboxDemo,
  InputDemo,
} from './sections/Basic';
import { ModalDemo, DrawerDemo, TooltipDemo } from './sections/Feedback';
import { DropdownDemo } from './sections/Dropdown';
import { TableDemo, CalendarDemo, ResizableSplitDemo } from './sections/Data';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
  wide?: boolean;
}

const ITEMS: SidebarItem[] = [
  { id: 'button', label: 'Button', icon: MousePointerClick, component: ButtonTab, wide: true },
  { id: 'badge', label: 'Badge', icon: Tag, component: BadgeDemo },
  { id: 'kbd', label: 'Kbd', icon: Keyboard, component: KbdDemo },
  { id: 'checkbox', label: 'Checkbox', icon: CheckSquare, component: CheckboxDemo },
  { id: 'input', label: 'Input', icon: TextCursorInput, component: InputDemo },
  { id: 'modal', label: 'Modal', icon: Layers, component: ModalDemo },
  { id: 'drawer', label: 'Drawer', icon: PanelRight, component: DrawerDemo },
  { id: 'dropdown', label: 'Dropdown', icon: Menu, component: DropdownDemo },
  { id: 'tooltip', label: 'Tooltip', icon: MessageSquare, component: TooltipDemo },
  { id: 'table', label: 'Table', icon: TableIcon, component: TableDemo },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon, component: CalendarDemo },
  { id: 'resizable-split', label: 'ResizableSplit', icon: PanelLeft, component: ResizableSplitDemo },
];

const UITest: React.FC = () => {
  const [activeId, setActiveId] = useState(ITEMS[0].id);
  const active = ITEMS.find((item) => item.id === activeId) ?? ITEMS[0];
  const ActiveContent = active.component;

  return (
    <div className="w-full h-full flex-1 flex flex-col overflow-hidden">
      <div className="h-[37px] shrink-0 border-b border-border px-5 flex items-center gap-2">
        <Home className="w-4 h-4 text-text-secondary -mt-0.5" />
        <ChevronRight className="w-3 h-3 text-text-secondary" />
        <span className="text-text-secondary text-sm">UI Test</span>
        <ChevronRight className="w-3 h-3 text-text-secondary" />
        <span className="text-text-primary text-sm font-medium">{active.label}</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-56 shrink-0 border-r border-border p-2 overflow-y-auto">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveId(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeId === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className={`flex flex-col gap-4 ${active.wide ? '' : 'max-w-4xl'}`}>
            <ActiveContent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UITest;