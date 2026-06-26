import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Database,
  Table,
  RefreshCw,
  Search,
  ListFilter,
  ArrowUpDown,
  SlidersHorizontal,
  Check,
  FileJson,
  FileSpreadsheet,
  File,
  Eye,
  EyeOff,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { db } from '../../../../database';
import { cn } from '../../../../shared/lib/utils';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '../../../../components/ui/Dropdown';
import { Badge } from '../../../../components/ui/Badge/Badge';

interface TableInfo {
  name: string;
  sql: string;
}

interface TableData {
  columns: string[];
  columnTypes: Record<string, string>;
  rows: Record<string, any>[];
}

type Operator =
  | 'equals'
  | 'not_equal'
  | 'greater'
  | 'less'
  | 'contains'
  | 'starts_with'
  | 'ends_with';

const OPERATORS: { value: Operator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equal', label: 'Not Equal' },
  { value: 'greater', label: 'Greater Than' },
  { value: 'less', label: 'Less Than' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
];

interface FilterCondition {
  id: string;
  column: string;
  operator: Operator;
  value: string;
}

const DatabaseViewer: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(50);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterOperator, setFilterOperator] = useState<Operator>('equals');
  const [filterValue, setFilterValue] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showEllipsisDropdown, setShowEllipsisDropdown] = useState(false);
  const [sortSearchTerm, setSortSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(true);

  const filterIdCounter = useRef(0);

  // Load danh sách tables
  const loadTables = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await db.execute(
        `SELECT name, sql FROM sqlite_master 
         WHERE type='table' 
         AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
      );

      setTables(result as TableInfo[]);

      if (result.length > 0 && !selectedTable) {
        setSelectedTable(result[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables');
      console.error('Load tables error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Parse column types from CREATE TABLE statement
  const parseColumnTypes = (sql: string): Record<string, string> => {
    const types: Record<string, string> = {};
    const match = sql.match(/\(([^)]+)\)/);
    if (match) {
      const columnDefs = match[1].split(',').map((col: string) => col.trim());
      columnDefs.forEach((def: string) => {
        const parts = def.split(/\s+/);
        if (parts.length >= 2) {
          const colName = parts[0].replace(/["`]/g, '');
          const colType = parts[1].toUpperCase();
          types[colName] = colType;
        }
      });
    }
    return types;
  };

  // Load data của table được chọn
  const loadTableData = async (tableName: string) => {
    if (!tableName) return;

    try {
      setLoading(true);
      setError(null);

      const rows = await db.execute(`SELECT * FROM ${tableName} LIMIT 1000`);

      let columns: string[] = [];
      let columnTypes: Record<string, string> = {};

      if (rows.length > 0) {
        columns = Object.keys(rows[0]);
        // Get schema for types
        const schemaResult = await db.execute(
          `SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`,
          [tableName],
        );
        if (schemaResult.length > 0) {
          const sql = (schemaResult[0] as any).sql;
          columnTypes = parseColumnTypes(sql);
        }
        setTableData({
          columns,
          columnTypes,
          rows: rows as Record<string, any>[],
        });
      } else {
        const schemaResult = await db.execute(
          `SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`,
          [tableName],
        );
        if (schemaResult.length > 0) {
          const sql = (schemaResult[0] as any).sql;
          columnTypes = parseColumnTypes(sql);
          columns = Object.keys(columnTypes);
          setTableData({
            columns,
            columnTypes,
            rows: [],
          });
        }
      }

      // Reset pagination
      setCurrentPage(1);
      // Reset column visibility to show all
      if (columns.length > 0) {
        const vis: Record<string, boolean> = {};
        columns.forEach((col) => {
          vis[col] = true;
        });
        setColumnVisibility(vis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load data from ${tableName}`);
      console.error('Load table data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh tables
  const handleRefresh = async () => {
    await loadTables();
    if (selectedTable) {
      await loadTableData(selectedTable);
    }
  };

  // Load tables on mount
  useEffect(() => {
    loadTables();
  }, []);

  // Load data when selected table changes
  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
      setSearchTerm('');
      setFilters([]);
      setShowFilterBar(false);
    }
  }, [selectedTable]);

  // Build filter conditions for SQL
  const buildWhereClause = useCallback((): string => {
    if (filters.length === 0) return '';

    const conditions = filters
      .map((f) => {
        const col = f.column;
        const val = f.value;
        if (!val) return '';

        switch (f.operator) {
          case 'equals':
            return `${col} = '${val}'`;
          case 'not_equal':
            return `${col} != '${val}'`;
          case 'greater':
            return `${col} > '${val}'`;
          case 'less':
            return `${col} < '${val}'`;
          case 'contains':
            return `${col} LIKE '%${val}%'`;
          case 'starts_with':
            return `${col} LIKE '${val}%'`;
          case 'ends_with':
            return `${col} LIKE '%${val}'`;
          default:
            return '';
        }
      })
      .filter(Boolean);

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }, [filters]);

  // Apply filters to data
  const getFilteredRows = useCallback(() => {
    if (!tableData) return [];
    const whereClause = buildWhereClause();
    if (!whereClause) return tableData.rows;

    // Simple client-side filtering for now (since we have limited data)
    // In production, this would be a server query
    const rows = tableData.rows.filter((row) => {
      return filters.every((f) => {
        const val = row[f.column];
        if (val === null || val === undefined) return false;
        const strVal = String(val);
        const searchVal = f.value;

        switch (f.operator) {
          case 'equals':
            return strVal === searchVal;
          case 'not_equal':
            return strVal !== searchVal;
          case 'greater':
            return Number(strVal) > Number(searchVal);
          case 'less':
            return Number(strVal) < Number(searchVal);
          case 'contains':
            return strVal.toLowerCase().includes(searchVal.toLowerCase());
          case 'starts_with':
            return strVal.toLowerCase().startsWith(searchVal.toLowerCase());
          case 'ends_with':
            return strVal.toLowerCase().endsWith(searchVal.toLowerCase());
          default:
            return true;
        }
      });
    });

    return rows;
  }, [tableData, filters, buildWhereClause]);

  

  // Build columns for react-table
  const columns = useMemo<ColumnDef<any>[]>(() => {
    if (!tableData) return [];

    const cols: ColumnDef<any>[] = [
      {
        id: 'select',
        header: ({ table }) => (
          <button
            onClick={() => table.toggleAllRowsSelected(!table.getIsAllRowsSelected())}
            className={cn(
              'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer select-none',
              table.getIsAllRowsSelected()
                ? 'bg-primary border-primary text-text-foreground shadow-sm shadow-primary/20'
                : 'border-border bg-card-background/50 hover:border-border-hover text-transparent',
            )}
          >
            <Check className="w-2.5 h-2.5 stroke-[3.5]" />
          </button>
        ),
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              row.toggleSelected(!row.getIsSelected());
            }}
            className={cn(
              'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer select-none',
              row.getIsSelected()
                ? 'bg-primary border-primary text-text-foreground shadow-sm shadow-primary/20'
                : 'border-border bg-card-background/50 hover:border-border-hover text-transparent',
            )}
          >
            <Check className="w-2.5 h-2.5 stroke-[3.5]" />
          </button>
        ),
        size: 35,
        enableHiding: false,
      },
    ];

    tableData.columns.forEach((col) => {
      const type = tableData.columnTypes[col] || 'TEXT';
      cols.push({
        accessorKey: col,
        header: () => (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-text-primary">{col}</span>
            <span className="text-[10px] text-text-secondary font-normal opacity-60">{type}</span>
          </div>
        ),
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
        size: 150,
        enableHiding: true,
      });
    });

    return cols;
  }, [tableData]);

  // Get filtered data
  const filteredData = useMemo(() => {
    if (!tableData) return [];
    let data = getFilteredRows();

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      data = data.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(search)),
      );
    }

    return data;
  }, [tableData, getFilteredRows, searchTerm]);

  // Paginate
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, rowsPerPage]);

  

  const table = useReactTable({
    data: paginatedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    getRowId: (_row, index) => `${index}`,
  });

  // Add filter handler
  const handleAddFilter = () => {
    if (!filterColumn || !filterValue) return;
    setFilters([
      ...filters,
      {
        id: `filter-${filterIdCounter.current++}`,
        column: filterColumn,
        operator: filterOperator,
        value: filterValue,
      },
    ]);
    setFilterColumn('');
    setFilterValue('');
    setFilterOperator('equals');
  };

  const handleRemoveFilter = (id: string) => {
    setFilters(filters.filter((f) => f.id !== id));
  };

  const handleClearFilters = () => {
    setFilters([]);
    setFilterColumn('');
    setFilterValue('');
  };

  // Export functions
  const exportToJson = () => {
    const data = filteredData;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCsv = () => {
    if (!tableData || filteredData.length === 0) return;
    const headers = tableData.columns.join(',');
    const rows = filteredData.map((row) =>
      tableData.columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return String(val);
        })
        .join(','),
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToXlsx = () => {
    // Simple XLSX export using HTML table
    if (!tableData || filteredData.length === 0) return;
    let html = '<html><head><meta charset="UTF-8"><title>Export</title></head><body><table>';
    html += '<tr>' + tableData.columns.map((col) => `<th>${col}</th>`).join('') + '</tr>';
    filteredData.forEach((row) => {
      html +=
        '<tr>' +
        tableData.columns
          .map((col) => {
            const val = row[col];
            if (val === null || val === undefined) return '<td></td>';
            return `<td>${String(val)}</td>`;
          })
          .join('') +
        '</tr>';
    });
    html += '</table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_export.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const availableColumns = tableData?.columns || [];

  // Filter available columns based on sort search
  const filteredColumns = availableColumns.filter(col =>
    col.toLowerCase().includes(sortSearchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Left Panel - Danh sách tables */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col overflow-hidden">
        {/* Table List Header */}
        <div className="px-2 py-2 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <Database className="w-4 h-4" />
              <span>Table</span>
              <span className="text-xs text-text-secondary ml-1">({tables.length})</span>
            </div>
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded bg-input-background hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Search Bar - moved below header with reduced height */}
        <div className="px-2 py-1.5 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            {tables.map((table) => (
              <button
                key={table.name}
                onClick={() => setSelectedTable(table.name)}
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

      {/* Right Panel - Table data */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTable && tableData ? (
          <>
            {/* Header Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 gap-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary">{selectedTable}</span>
                <span className="text-xs text-text-secondary">{filteredData.length} records</span>
              </div>

              <div className="flex items-center gap-1">
                {/* Filter Button */}
                <button
                  onClick={() => setShowFilterBar(!showFilterBar)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                    showFilterBar
                      ? 'bg-primary/20 text-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover',
                  )}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {filters.length > 0 && (
                    <span className="ml-0.5 text-[10px] bg-primary/30 text-primary px-1 rounded">
                      {filters.length}
                    </span>
                  )}
                </button>

                {/* Sort Dropdown - right aligned, no overflow */}
                <div className="relative">
                  <Dropdown open={showSortDropdown} onOpenChange={setShowSortDropdown}>
                    <DropdownTrigger asChild>
                      <button className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors">
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>Sort</span>
                        {sorting.length > 0 && (
                          <span className="ml-0.5 text-[10px] bg-primary/30 text-primary px-1 rounded">
                            {sorting.length}
                          </span>
                        )}
                      </button>
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
                              : 'bg-card-background text-text-secondary border border-border'
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

                      {/* Searchbar - no padding, no background, no outline */}
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

                      {/* Sort Items with tickUI */}
                      {filteredColumns.map((col) => {
                        const isActive = sorting.some((s) => s.id === col);
                        const sortDir = sorting.find((s) => s.id === col)?.desc ? 'desc' : 'asc';
                        return (
                          <DropdownItem
                            key={col}
                            onClick={() => {
                              const existing = sorting.find((s) => s.id === col);
                              if (existing) {
                                const newSorting = sorting.map((s) =>
                                  s.id === col ? { ...s, desc: !s.desc } : s
                                );
                                setSorting(newSorting);
                              } else {
                                setSorting([...sorting, { id: col, desc: !isAscending }]);
                              }
                              setShowSortDropdown(false);
                            }}
                            className="flex items-center gap-2"
                          >
                            <div className="flex items-center justify-center w-4 h-4 shrink-0">
                              {isActive && (
                                <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
                              )}
                            </div>
                            <span className="flex-1 text-xs">{col}</span>
                            {isActive && (
                              <span className="text-[10px] text-text-secondary">
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
                              setSorting([]);
                              setShowSortDropdown(false);
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
                  <Dropdown open={showColumnDropdown} onOpenChange={setShowColumnDropdown}>
                    <DropdownTrigger asChild>
                      <button className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Column</span>
                      </button>
                    </DropdownTrigger>
                    <DropdownContent className="right-0 left-auto min-w-[200px] max-h-[300px] overflow-y-auto">
                      {availableColumns.map((col) => {
                        const isVisible = columnVisibility[col] !== false;
                        return (
                          <DropdownItem
                            key={col}
                            onClick={() => {
                              setColumnVisibility({
                                ...columnVisibility,
                                [col]: !isVisible,
                              });
                              setShowColumnDropdown(false);
                            }}
                            className="flex items-center gap-2"
                          >
                            {isVisible ? (
                              <Eye className="w-3.5 h-3.5 text-text-secondary" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-text-secondary" />
                            )}
                            <span className="flex-1 text-xs">{col}</span>
                            <GripVertical className="w-3.5 h-3.5 text-text-secondary opacity-40 cursor-grab" />
                          </DropdownItem>
                        );
                      })}
                    </DropdownContent>
                  </Dropdown>
                </div>

                {/* Ellipsis Dropdown */}
                <div className="relative">
                  <Dropdown open={showEllipsisDropdown} onOpenChange={setShowEllipsisDropdown}>
                    <DropdownTrigger asChild>
                      <button className="p-1 rounded hover:bg-dropdown-item-hover transition-colors">
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
                          className="w-3.5 h-3.5 text-text-secondary"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="19" cy="12" r="1" />
                          <circle cx="5" cy="12" r="1" />
                        </svg>
                      </button>
                    </DropdownTrigger>
                    <DropdownContent className="right-0 left-auto min-w-[180px]">
                      <DropdownItem
                        onClick={exportToJson}
                        icon={<FileJson className="w-3.5 h-3.5" />}
                      >
                        Export all to .json
                      </DropdownItem>
                      <DropdownItem onClick={exportToCsv} icon={<File className="w-3.5 h-3.5" />}>
                        Export all to .csv
                      </DropdownItem>
                      <DropdownItem
                        onClick={exportToXlsx}
                        icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                      >
                        Export all to .xlsx
                      </DropdownItem>
                    </DropdownContent>
                  </Dropdown>
                </div>
              </div>
            </div>
            {/* Filter Bar */}
            {showFilterBar && (
              <div className="px-4 py-2 border-b border-border bg-card-background/50 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge count={filters.length} className="bg-primary/20 text-primary" />
                  <span className="text-xs text-text-secondary font-medium">where</span>

                  {/* Column Dropdown */}
                  <select
                    value={filterColumn}
                    onChange={(e) => setFilterColumn(e.target.value)}
                    className="h-7 px-2 text-xs bg-input-background border border-border rounded focus:border-primary/50 outline-none"
                  >
                    <option value="">Select column</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>

                  {/* Operator Dropdown */}
                  <select
                    value={filterOperator}
                    onChange={(e) => setFilterOperator(e.target.value as Operator)}
                    className="h-7 px-2 text-xs bg-input-background border border-border rounded focus:border-primary/50 outline-none"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  {/* Input with dropdown */}
                  <div className="relative">
                    <input
                      type="text"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder="Value..."
                      className="h-7 px-2 text-xs bg-input-background border border-border rounded focus:border-primary/50 outline-none w-32"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
                    />
                    {filterValue && (
                      <div className="absolute top-full left-0 mt-0.5 bg-modal-background border border-border rounded shadow-lg min-w-[120px] z-10">
                        <button
                          onClick={() => {
                            setFilterValue('NULL');
                          }}
                          className="w-full px-3 py-1 text-xs text-left hover:bg-dropdown-item-hover"
                        >
                          NULL
                        </button>
                        <button
                          onClick={() => {
                            setFilterValue('');
                          }}
                          className="w-full px-3 py-1 text-xs text-left hover:bg-dropdown-item-hover"
                        >
                          Empty string
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAddFilter}
                    disabled={!filterColumn || !filterValue}
                    className="px-3 py-1 text-xs bg-primary text-zinc-950 rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add filter
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="px-3 py-1 text-xs border border-border rounded hover:bg-dropdown-item-hover transition-colors"
                  >
                    Clear filters
                  </button>
                </div>

                {/* Active filters */}
                {filters.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.map((f) => (
                      <span
                        key={f.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded border border-primary/20"
                      >
                        <span className="font-medium">{f.column}</span>
                        <span className="text-text-secondary opacity-50">{f.operator}</span>
                        <span className="font-mono">"{f.value}"</span>
                        <button
                          onClick={() => handleRemoveFilter(f.id)}
                          className="ml-0.5 text-text-secondary hover:text-error"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <div className="w-full h-full overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-background z-10">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b border-border">
                        {headerGroup.headers.map((header) => {
                          if (header.column.getIsVisible() === false) return null;
                          return (
                            <th
                              key={header.id}
                              className="px-3 py-2 text-left border-r border-border last:border-r-0 whitespace-nowrap"
                              style={{ width: header.getSize() }}
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={table.getAllColumns().filter((c) => c.getIsVisible()).length}
                          className="px-4 py-8 text-center text-text-secondary text-sm"
                        >
                          No data found
                        </td>
                      </tr>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-border hover:bg-dropdown-item-hover/50 transition-colors"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="px-3 py-1.5 border-r border-border last:border-r-0 whitespace-nowrap"
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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

export default DatabaseViewer;