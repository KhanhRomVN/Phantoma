/**
 * ------------------------------------------------------------------
 * Group Picker Form
 * ------------------------------------------------------------------
 * Inline form to create or edit a Project Group.
 * - Icon picker: Custom dropdown with Lucide icons.
 * - Name input: Limited length, validated on blur/enter.
 * - Drag handle: Allows reordering groups in the list.
 * ------------------------------------------------------------------
 */

import { useState, useRef, useEffect, memo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FolderGit2, 
  Package, 
  Layers, 
  Box, 
  Archive, 
  Briefcase, 
  HardDrive, 
  Server, 
  Cloud, 
  Database, 
  Terminal, 
  Code, 
  GitBranch, 
  Check,
  X,
  GripVertical
} from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '@renderer/components/ui/Dropdown';

// ─── Available Icons for Groups ──────────────────────────────────────
export const GROUP_ICONS = [
  { id: 'folder', icon: <Folder className="w-4 h-4" />, label: 'Folder' },
  { id: 'folder-open', icon: <FolderOpen className="w-4 h-4" />, label: 'Folder Open' },
  { id: 'git', icon: <FolderGit2 className="w-4 h-4" />, label: 'Git Repo' },
  { id: 'package', icon: <Package className="w-4 h-4" />, label: 'Package' },
  { id: 'layers', icon: <Layers className="w-4 h-4" />, label: 'Layers' },
  { id: 'box', icon: <Box className="w-4 h-4" />, label: 'Box' },
  { id: 'archive', icon: <Archive className="w-4 h-4" />, label: 'Archive' },
  { id: 'briefcase', icon: <Briefcase className="w-4 h-4" />, label: 'Work' },
  { id: 'drive', icon: <HardDrive className="w-4 h-4" />, label: 'Drive' },
  { id: 'server', icon: <Server className="w-4 h-4" />, label: 'Server' },
  { id: 'cloud', icon: <Cloud className="w-4 h-4" />, label: 'Cloud' },
  { id: 'database', icon: <Database className="w-4 h-4" />, label: 'DB' },
  { id: 'terminal', icon: <Terminal className="w-4 h-4" />, label: 'CLI' },
  { id: 'code', icon: <Code className="w-4 h-4" />, label: 'Code' },
  { id: 'branch', icon: <GitBranch className="w-4 h-4" />, label: 'Branch' },
];

const MAX_NAME_LENGTH = 30;

interface GroupPickerFormProps {
  initialIconId?: string;
  initialName?: string;
  onSave: (iconId: string, name: string) => void;
  onCancel: () => void;
  /** If true, this is an existing group being edited, not a new one */
  isEditing?: boolean;
  /** Drag handlers for reordering groups */
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export const GroupPickerForm = memo(function GroupPickerForm({
  initialIconId = 'folder',
  initialName = '',
  onSave,
  onCancel,
  isEditing = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging = false,
}: GroupPickerFormProps) {
  const [name, setName] = useState(initialName);
  const [selectedIconId, setSelectedIconId] = useState(initialIconId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(selectedIconId, trimmed.slice(0, MAX_NAME_LENGTH));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const currentIconObj = GROUP_ICONS.find((g) => g.id === selectedIconId) || GROUP_ICONS[0];

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => {
        // Prevent dragging if interacting with inputs/buttons inside
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.closest('button')) {
          e.stopPropagation();
          return;
        }
        onDragStart?.(e);
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        'group/gh',
        isDragging && 'opacity-50 scale-[0.98]',
      )}
    >
      {/* Drag Handle (visible on hover) */}
      {onDragStart && (
        <span className="cursor-grab active:cursor-grabbing text-text-secondary/30 hover:text-text-secondary opacity-0 group-hover/gh:opacity-100 transition-opacity shrink-0 float-left mr-2 mt-1.5">
          <GripVertical className="w-3.5 h-3.5" />
        </span>
      )}

      {/* Container for Button + Input 
          - Fixed height h-9 (36px) to define the row size explicitly.
          - No vertical padding on container, spacing is internal or via margin if needed, but here we want tight fit.
          - Items center vertically.
      */}
      <div className="w-full h-9 flex items-center gap-2">
        {/* Icon Picker Button */}
        <Dropdown open={dropdownOpen} onOpenChange={setDropdownOpen} trigger="click" align="start">
          <DropdownTrigger asChild>
            <button
              type="button"
              className="h-full aspect-square rounded-md bg-text-secondary/10 hover:bg-text-secondary/20 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              title="Pick icon"
            >
              {/* Force red color for the icon itself, full opacity */}
              <span className="text-[#ff4757] [&_svg]:w-4 [&_svg]:h-4">
                {currentIconObj.icon}
              </span>
            </button>
          </DropdownTrigger>
          <DropdownContent className="grid grid-cols-5 gap-1 p-1 max-w-[220px]">
            {GROUP_ICONS.map((g) => (
              <DropdownItem
                key={g.id}
                onClick={() => {
                  setSelectedIconId(g.id);
                  setDropdownOpen(false);
                }}
                className={cn(
                  'flex items-center justify-center p-2 rounded-md min-w-0',
                  selectedIconId === g.id ? 'bg-primary/10 text-primary' : 'hover:bg-card-hover text-text-secondary',
                )}
                title={g.label}
              >
                {g.icon}
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>

        {/* Name Input */}
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Group name..."
          maxLength={MAX_NAME_LENGTH}
          className="h-full flex-1 min-w-0 bg-text-secondary/10 border-none outline-none rounded-md px-2 text-[12px] font-medium text-text-primary placeholder:text-text-secondary/40 font-display focus:bg-text-secondary/15 transition-colors"
        />
      </div>
      
    </div>
  );
});

export default GroupPickerForm;