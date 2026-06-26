import React, { useState, useMemo, useCallback } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnSizingState,
  useReactTable,
} from '@tanstack/react-table';
import { Checkbox } from '../../../../components/ui/Checkbox';
import { useDatabase } from '../../hooks/useDatabase';
import { TableList } from './TableList';
import { TableHeader } from './TableHeader';
import { FilterBar } from './FilterBar';
import { DataTable } from './DataTable';
import { exportToJson, exportToCsv, exportToXlsx } from '../../utils/export';
import { ROWS_PER_PAGE } from '../../constants/database';

const DatabaseViewer: React.FC = () => {
  const {
    tables,
    selectedTable,
    setSelectedTable,
    tableData,
    loading,
    error,
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    getFilteredRows,
    refresh,
  } = useDatabase();

  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterBar, setShowFilterBar] = useState(false);

  // Build columns for react-table
  const columns = useMemo<ColumnDef<any>[]>(() => {
    if (!tableData) return [];

    const calculateMinWidth = (columnName: string, columnType: string): number => {
      const padding = 40;
      const baseWidth = 60;
      const nameLength = columnName.length;
      const typeLength = columnType.length;
      const totalLength = nameLength + typeLength + 2;
      const contentWidth = totalLength * 7;
      return Math.max(baseWidth, contentWidth + padding);
    };

    const cols: ColumnDef<any>[] = [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onChange={() => table.toggleAllRowsSelected(!table.getIsAllRowsSelected())}
            size="sm"
            className="w-3.5 h-3.5"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={() => row.toggleSelected(!row.getIsSelected())}
            size="sm"
            className="w-3.5 h-3.5"
          />
        ),
        size: 35,
        minSize: 35,
        maxSize: 35,
        enableHiding: false,
        enableResizing: false,
      },
    ];

    tableData.columns.forEach((col) => {
      const type = tableData.columnTypes[col] || 'TEXT';
      const minSize = calculateMinWidth(col, type);

      cols.push({
        accessorKey: col,
        header: ({ column }) => {
          const sortState = column.getIsSorted();
          let IconComponent = ChevronsUpDown;
          if (sortState === 'asc') {
            IconComponent = ArrowUpNarrowWide;
          } else if (sortState === 'desc') {
            IconComponent = ArrowDownNarrowWide;
          }

          return (
            <div
              className="flex items-center justify-between gap-2 cursor-pointer select-none"
              onClick={() => {
                const currentState = column.getIsSorted();
                if (currentState === false) {
                  column.toggleSorting(false);
                } else if (currentState === 'asc') {
                  column.toggleSorting(true);
                } else {
                  column.clearSorting();
                }
              }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-medium text-text-primary truncate">{col}</span>
                <span className="text-[10px] text-text-secondary font-normal opacity-60 shrink-0">
                  {type}
                </span>
              </div>
              <IconComponent className="w-3.5 h-3.5 text-text-secondary shrink-0" />
            </div>
          );
        },
        cell: ({ row }) => {
          const value = row.getValue(col);
          if (value === null || value === undefined) {
            return <span className="text-text-secondary italic text-xs">null</span>;
          }
          if (typeof value === 'object') {
            return (
              <span className="text-xs text-text-primary font-mono">{JSON.stringify(value)}</span>
            );
          }
          return <span className="text-xs text-text-primary font-mono">{String(value)}</span>;
        },
        size: minSize,
        minSize: minSize,
        enableHiding: true,
        enableResizing: true,
      });
    });

    return cols;
  }, [tableData]);

  // Get filtered data
  const filteredData = useMemo(() => {
    if (!tableData) return [];
    return getFilteredRows();
  }, [tableData, getFilteredRows]);

  // Paginate
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage]);

  const table = useReactTable({
    data: paginatedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: 'onChange',
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      columnSizing,
    },
    getRowId: (_row, index) => `${index}`,
  });

  const handleSelectTable = useCallback(
    (tableName: string) => {
      setSelectedTable(tableName);
      setCurrentPage(1);
      // Reset column visibility when switching tables
      if (tableData) {
        const vis: Record<string, boolean> = {};
        tableData.columns.forEach((col) => {
          vis[col] = true;
        });
        setColumnVisibility(vis);
      }
    },
    [setSelectedTable, tableData],
  );

  const handleRefresh = useCallback(async () => {
    await refresh();
    if (selectedTable) {
      // Reset column visibility after refresh
      if (tableData) {
        const vis: Record<string, boolean> = {};
        tableData.columns.forEach((col) => {
          vis[col] = true;
        });
        setColumnVisibility(vis);
      }
    }
  }, [refresh, selectedTable, tableData]);

  const handleExportJson = useCallback(() => {
    if (!selectedTable) return;
    exportToJson(filteredData, selectedTable);
  }, [filteredData, selectedTable]);

  const handleExportCsv = useCallback(() => {
    if (!selectedTable || !tableData) return;
    exportToCsv(tableData, filteredData, selectedTable);
  }, [filteredData, selectedTable, tableData]);

  const handleExportXlsx = useCallback(() => {
    if (!selectedTable || !tableData) return;
    exportToXlsx(tableData, filteredData, selectedTable);
  }, [filteredData, selectedTable, tableData]);

  const availableColumns = tableData?.columns || [];

  return (
    <div className="flex h-full">
      {/* Left Panel - Danh sách tables */}
      <TableList
        tables={tables}
        selectedTable={selectedTable}
        loading={loading}
        error={error}
        tableSearchTerm={tableSearchTerm}
        onTableSearchChange={setTableSearchTerm}
        onSelectTable={handleSelectTable}
        onRefresh={handleRefresh}
      />

      {/* Right Panel - Table data */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTable && tableData ? (
          <>
            {/* Header Bar */}
            <TableHeader
              selectedTable={selectedTable}
              totalRecords={filteredData.length}
              filtersCount={filters.length}
              showFilterBar={showFilterBar}
              onToggleFilterBar={() => setShowFilterBar(!showFilterBar)}
              sorting={sorting}
              onSortingChange={setSorting}
              availableColumns={availableColumns}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              onExportJson={handleExportJson}
              onExportCsv={handleExportCsv}
              onExportXlsx={handleExportXlsx}
              currentPage={currentPage}
              totalPages={Math.ceil(filteredData.length / ROWS_PER_PAGE)}
              onPageChange={setCurrentPage}
              onRefresh={handleRefresh}
            />

            {/* Filter Bar */}
            {showFilterBar && (
              <FilterBar
                filters={filters}
                availableColumns={availableColumns}
                onAddFilter={addFilter}
                onRemoveFilter={removeFilter}
                onClearFilters={clearFilters}
              />
            )}

            {/* Table */}
            <DataTable table={table} dataLength={paginatedData.length} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            {loading ? 'Loading...' : 'Select a table to view data'}
          </div>
        )}
      </div>
    </div>
  );
};

// Re-export các icon cần thiết
const ChevronsUpDown = ({ className }: { className?: string }) => (
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
    className={className}
  >
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </svg>
);

const ArrowUpNarrowWide = ({ className }: { className?: string }) => (
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
    className={className}
  >
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
    <path d="M11 12h10" />
    <path d="M11 16h7" />
    <path d="M11 20h4" />
  </svg>
);

const ArrowDownNarrowWide = ({ className }: { className?: string }) => (
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
    className={className}
  >
    <path d="m3 16 4 4 4-4" />
    <path d="M7 20V4" />
    <path d="M11 4h10" />
    <path d="M11 8h7" />
    <path d="M11 12h4" />
  </svg>
);

export default DatabaseViewer;
