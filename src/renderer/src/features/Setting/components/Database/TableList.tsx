import React, { useEffect } from 'react';
import { Database, Table, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { TableInfo } from '../../types/database';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownSub, DropdownSubTrigger, DropdownSubContent } from '../../../../components/ui/Dropdown';

interface TableListProps {
  tables: TableInfo[];
  selectedTable: string | null;
  loading: boolean;
  error: string | null;
  tableSearchTerm: string;
  onTableSearchChange: (value: string) => void;
  onSelectTable: (tableName: string) => void;
  onRefresh: () => void;
}

export const TableList: React.FC<TableListProps> = ({
  tables,
  selectedTable,
  loading,
  error,
  tableSearchTerm,
  onTableSearchChange,
  onSelectTable,
  onRefresh,
}) => {
  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(tableSearchTerm.toLowerCase()),
  );

  // Auto-select first table if at least one table exists and no table is selected
  useEffect(() => {
    if (tables.length > 0 && !selectedTable) {
      onSelectTable(tables[0].name);
    }
  }, [tables, selectedTable, onSelectTable]);

  return (
    <div className="w-64 shrink-0 border-r border-border flex flex-col overflow-hidden">
      {/* Table List Header */}
      <div className="px-2 py-[8px] border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <Database className="w-4 h-4" />
            <span>Table</span>
            <span className="text-xs text-text-secondary ml-1">({tables.length})</span>
          </div>
          <div className="flex items-center gap-1">
            
            <button
              onClick={onRefresh}
              className="p-1.5 rounded hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-2 py-1.5 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search tables..."
            value={tableSearchTerm}
            onChange={(e) => onTableSearchChange(e.target.value)}
            className="w-full h-7 bg-input-background border border-input-border-default rounded-md pl-8 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary/50 outline-none"
          />
        </div>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && tables.length === 0 ? (
          <div className="text-center text-text-secondary text-sm py-4">Loading...</div>
        ) : error ? (
          <div className="text-error text-sm py-4 px-2">{error}</div>
        ) : tables.length === 0 ? (
          <div className="text-center text-text-secondary text-sm py-4">No tables found</div>
        ) : (
          <div className="space-y-0.5">
            {filteredTables.map((table) => (
              <button
                key={table.name}
                onClick={() => onSelectTable(table.name)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedTable === table.name
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover'
                }`}
              >
                <Table className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate font-mono text-xs">{table.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
