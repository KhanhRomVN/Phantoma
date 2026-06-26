import React, { useState } from 'react';
import {
  ListFilter,
  ArrowUpDown,
  SlidersHorizontal,
  Search,
  Eye,
  EyeOff,
  GripVertical,
  ChevronUp,
  ChevronDown,
  FileJson,
  FileSpreadsheet,
  File,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '../../../../components/ui/Dropdown';
import { Checkbox } from '../../../../components/ui/Checkbox';
import { Button } from '../../../../components/ui/Button';
import { SortingState } from '@tanstack/react-table';

interface TableHeaderProps {
  selectedTable: string;
  totalRecords: number;
  filtersCount: number;
  showFilterBar: boolean;
  onToggleFilterBar: () => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  availableColumns: string[];
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (visibility: Record<string, boolean>) => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onExportXlsx: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh?: () => void;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  selectedTable,
  totalRecords,
  filtersCount,
  showFilterBar,
  onToggleFilterBar,
  sorting,
  onSortingChange,
  availableColumns,
  columnVisibility,
  onColumnVisibilityChange,
  onExportJson,
  onExportCsv,
  onExportXlsx,
  currentPage,
  totalPages,
  onPageChange,
  onRefresh,
}) => {
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showEllipsisDropdown, setShowEllipsisDropdown] = useState(false);
  const [sortSearchTerm, setSortSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true);

  const filteredColumns = availableColumns.filter((col) =>
    col.toLowerCase().includes(sortSearchTerm.toLowerCase()),
  );

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const startRecord = (currentPage - 1) * 50 + 1;
  const endRecord = Math.min(currentPage * 50, totalRecords);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 gap-2">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text-primary">{selectedTable}</span>
        <span className="text-xs text-text-secondary">{totalRecords} records</span>
      </div>

      <div className="flex items-center gap-1">
        {/* Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFilterBar}
          className={cn(
            'gap-1 px-2 py-1 text-xs h-7',
            showFilterBar && 'bg-primary/20 text-primary border-primary/50'
          )}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Filter</span>
          {filtersCount > 0 && (
            <span className="ml-0.5 text-[10px] bg-primary/30 text-primary px-1 rounded">
              {filtersCount}
            </span>
          )}
        </Button>

        {/* Sort Dropdown */}
        <div className="relative">
          <Dropdown open={showSortDropdown} onOpenChange={setShowSortDropdown} align="end">
            <DropdownTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 px-2 py-1 text-xs h-7">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Sort</span>
                {sorting.length > 0 && (
                  <span className="ml-0.5 text-[10px] bg-primary/30 text-primary px-1 rounded">
                    {sorting.length}
                  </span>
                )}
              </Button>
            </DropdownTrigger>
            <DropdownContent className="right-0 left-auto min-w-[200px] max-h-[300px] overflow-y-auto">
              {/* Ascending Toggle */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-text-primary">Sort by</span>
                <button
                  onClick={() => setIsAscending(!isAscending)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors',
                    isAscending
                      ? 'bg-primary/20 text-primary'
                      : 'bg-card-background text-text-secondary border border-border',
                  )}
                >
                  {isAscending ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Ascending
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      Descending
                    </>
                  )}
                </button>
              </div>

              {/* Searchbar */}
              <div className="px-2 py-1 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={sortSearchTerm}
                    onChange={(e) => setSortSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-xs text-text-primary placeholder:text-text-secondary bg-transparent border-0 outline-none"
                  />
                </div>
              </div>

              {/* Sort Items */}
              {filteredColumns.map((col) => {
                const isActive = sorting.some((s) => s.id === col);
                const sortDir = sorting.find((s) => s.id === col)?.desc ? 'desc' : 'asc';
                return (
                  <DropdownItem
                    key={col}
                    className="grid grid-cols-[24px_1fr_24px] items-center gap-1 w-full"
                  >
                    <div className="flex items-center justify-center w-4 h-4 justify-self-center">
                      <Checkbox
                        checked={isActive}
                        onChange={() => {
                          const existing = sorting.find((s) => s.id === col);
                          if (existing) {
                            const newSorting = sorting.map((s) =>
                              s.id === col ? { ...s, desc: !s.desc } : s,
                            );
                            onSortingChange(newSorting);
                          } else {
                            onSortingChange([...sorting, { id: col, desc: !isAscending }]);
                          }
                        }}
                        size="sm"
                        inputClassName="w-3.5 h-3.5"
                      />
                    </div>
                    <span className="text-xs text-left">{col}</span>
                    {isActive && (
                      <span className="text-[10px] text-text-secondary text-center">
                        {sortDir === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </DropdownItem>
                );
              })}
              {sorting.length > 0 && (
                <>
                  <DropdownSeparator />
                  <DropdownItem
                    onClick={() => {
                      onSortingChange([]);
                    }}
                  >
                    <span className="text-text-secondary text-xs">Clear sort</span>
                  </DropdownItem>
                </>
              )}
            </DropdownContent>
          </Dropdown>
        </div>

        {/* Column Dropdown */}
        <div className="relative">
          <Dropdown open={showColumnDropdown} onOpenChange={setShowColumnDropdown} align="end">
            <DropdownTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 px-2 py-1 text-xs h-7">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Column</span>
              </Button>
            </DropdownTrigger>
            <DropdownContent className="right-0 left-auto min-w-[200px] max-h-[300px] overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-text-primary">Manage columns</span>
                <button
                  onClick={() => {
                    const allVisible = availableColumns.every(col => columnVisibility[col] !== false);
                    const newVisibility: Record<string, boolean> = {};
                    availableColumns.forEach(col => {
                      newVisibility[col] = !allVisible;
                    });
                    onColumnVisibilityChange(newVisibility);
                  }}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors',
                    availableColumns.every(col => columnVisibility[col] !== false)
                      ? 'bg-primary/20 text-primary'
                      : 'bg-card-background text-text-secondary border border-border'
                  )}
                >
                  {availableColumns.every(col => columnVisibility[col] !== false) ? (
                    'Hide all'
                  ) : (
                    'Show all'
                  )}
                </button>
              </div>
              <div className="px-2 py-1 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search columns..."
                    value={sortSearchTerm}
                    onChange={(e) => setSortSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-xs text-text-primary placeholder:text-text-secondary bg-transparent border-0 outline-none"
                  />
                </div>
              </div>
              {availableColumns
                .filter((col) => col.toLowerCase().includes(sortSearchTerm.toLowerCase()))
                .map((col) => {
                  const isVisible = columnVisibility[col] !== false;
                  return (
                    <DropdownItem
                      key={col}
                      onClick={() => {
                        onColumnVisibilityChange({
                          ...columnVisibility,
                          [col]: !isVisible,
                        });
                      }}
                      className="grid grid-cols-[24px_1fr_24px] items-center gap-1 w-full"
                    >
                      <div className="flex items-center justify-center w-4 h-4 justify-self-center">
                        {isVisible ? (
                          <Eye className="w-3.5 h-3.5 text-text-secondary" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-text-secondary" />
                        )}
                      </div>
                      <span className="text-xs text-left">{col}</span>
                      <div className="flex items-center justify-center w-4 h-4 justify-self-center">
                        <GripVertical className="w-3.5 h-3.5 text-text-secondary opacity-40 cursor-grab" />
                      </div>
                    </DropdownItem>
                  );
                })}
            </DropdownContent>
          </Dropdown>
        </div>

        {/* Pagination */}
        {totalRecords > 0 && (
          <div className="flex items-center">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
              className={cn(
                'flex items-center justify-center size-7 border border-border rounded-l-md bg-button-outline text-button-outline-text hover:text-button-outline-hover-text hover:border-button-outline-hover-border hover:bg-button-outline-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-button-outline disabled:hover:text-button-outline-text',
              )}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center h-7 px-1.5 border-y border-border bg-background/50">
              <span className="text-xs text-text-secondary tabular-nums">
                {startRecord} - {endRecord}
              </span>
              <span className="text-xs text-text-secondary mx-1">of</span>
              <span className="text-xs text-text-secondary tabular-nums">{totalRecords}</span>
            </div>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className={cn(
                'flex items-center justify-center size-7 border border-border rounded-r-md bg-button-outline text-button-outline-text hover:text-button-outline-hover-text hover:border-button-outline-hover-border hover:bg-button-outline-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-button-outline disabled:hover:text-button-outline-text',
              )}
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center justify-center size-7 rounded-md border border-border bg-button-outline text-button-outline-text hover:text-button-outline-hover-text hover:border-button-outline-hover-border hover:bg-button-outline-hover transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Ellipsis Dropdown */}
        <div className="relative">
          <Dropdown open={showEllipsisDropdown} onOpenChange={setShowEllipsisDropdown} align="end">
            <DropdownTrigger asChild>
              <Button variant="outline" size="sm" className="gap-0 px-0 py-0 w-7 h-7 text-xs">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </Button>
            </DropdownTrigger>
            <DropdownContent className="right-0 left-auto min-w-[180px]">
              <DropdownItem
                onClick={onExportJson}
                icon={<FileJson className="w-3.5 h-3.5" />}
              >
                Export all to .json
              </DropdownItem>
              <DropdownItem onClick={onExportCsv} icon={<File className="w-3.5 h-3.5" />}>
                Export all to .csv
              </DropdownItem>
              <DropdownItem
                onClick={onExportXlsx}
                icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              >
                Export all to .xlsx
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </div>
    </div>
  );
};

export default TableHeader;