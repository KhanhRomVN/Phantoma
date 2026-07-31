import { ChevronRight, ChevronDown, FolderOpen, Search } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import FileIcon from '../../../../components/common/FileIcon';
import { ResourceItem, ResourceType, TYPE_LABELS } from './types';

interface ResourceListProps {
  groupedItems: Record<ResourceType, ResourceItem[]>;
  expandedGroups: Set<ResourceType>;
  onToggleGroup: (type: ResourceType) => void;
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  totalCount: number;
}

export function ResourceList({
  groupedItems,
  expandedGroups,
  onToggleGroup,
  selectedId,
  onSelectItem,
  searchTerm,
  onSearchChange,
  totalCount,
}: ResourceListProps) {
  return (
    <div className="w-80 shrink-0 border-r border-border flex flex-col bg-background">
      {/* Search bar */}
      <div className="px-3 py-1.5 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8 bg-input-background border border-input-border-default rounded-md pl-8 pr-3 text-sm text-text-primary focus:border-blue-500/50 outline-none"
          />
        </div>
      </div>

      {/* Group list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {Object.entries(groupedItems).map(([type, items]) => {
          if (items.length === 0) return null;
          const isExpanded = expandedGroups.has(type as ResourceType);
          const label = TYPE_LABELS[type as ResourceType] || type;

          return (
            <div key={type} className="space-y-0.5">
              <button
                onClick={() => onToggleGroup(type as ResourceType)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors text-xs font-medium text-text-secondary"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="flex-1 text-left">{label}</span>
                <span className="text-[9px] text-text-secondary/60">{items.length}</span>
              </button>

              {isExpanded && (
                <div className="ml-5 space-y-0.5">
                  {items.map((item) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectItem(item.id)}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all text-xs',
                          isSelected
                            ? 'bg-card-background text-text-primary'
                            : 'text-text-primary hover:bg-card-hover',
                        )}
                      >
                        <FileIcon path={item.path} className="w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate">{item.filename}</span>
                        <span className="text-[9px] text-text-secondary/60 shrink-0">
                          {item.size}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {totalCount === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <FolderOpen className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">No resources found</p>
            <p className="text-xs mt-1 opacity-60">Load a page to see assets</p>
          </div>
        )}
      </div>
    </div>
  );
}