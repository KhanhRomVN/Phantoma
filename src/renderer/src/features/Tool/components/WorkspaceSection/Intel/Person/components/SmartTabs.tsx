import React from 'react';
import type { SmartCategoryGroup } from '../types/smart-category';
import { cn } from '../../../../../../../shared/lib/utils';
import {
  LayoutDashboard,
  Users,
  User,
  Mail,
  Share2,
  Briefcase,
  Cpu,
  AlertTriangle,
  EyeOff,
  Image,
  CreditCard,
  Scale,
  Clock,
  GitBranch,
  FileJson,
  Database,
  ChevronDown,
} from 'lucide-react';

interface SmartTabsProps {
  groups: SmartCategoryGroup[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  selectedEntityName?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  User,
  Mail,
  Share2,
  Briefcase,
  Cpu,
  AlertTriangle,
  EyeOff,
  Image,
  CreditCard,
  Scale,
  Clock,
  GitBranch,
  FileJson,
  Database,
};

export function SmartTabs({ groups, activeTab, onTabChange, selectedEntityName }: SmartTabsProps) {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const activeTabs = groups.filter((g) => g.isActive);

  const renderIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName];
    if (Icon) return <Icon className="w-3.5 h-3.5" />;
    return <FileJson className="w-3.5 h-3.5" />;
  };

  return (
    <div className="flex items-center gap-1 flex-wrap" ref={dropdownRef}>
      {activeTabs.map((group) => (
        <button
          key={group.id}
          onClick={() => onTabChange(group.id)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono font-bold transition-all whitespace-nowrap',
            activeTab === group.id ? 'bg-[#1c2333]' : 'hover:bg-[#111827] text-[#6a7a9a]',
          )}
          style={{
            color: activeTab === group.id ? group.accent : undefined,
          }}
        >
          <span style={{ color: activeTab === group.id ? group.accent : '#6a7a9a' }}>
            {renderIcon(group.icon)}
          </span>
          <span>{group.label}</span>
          {group.count > 0 && <span className="text-[9px] opacity-60">({group.count})</span>}
        </button>
      ))}

      {/* Entity indicator */}
      {selectedEntityName && (
        <div className="ml-auto text-[10px] font-mono text-[#6a7a9a] shrink-0 px-2">
          Entity: <span className="text-[#0af]">{selectedEntityName}</span>
        </div>
      )}
    </div>
  );
}
