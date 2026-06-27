import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../../database';
import { TableInfo, TableData, FilterCondition, Operator } from '../types/database';

export function useDatabase() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const filterIdCounter = useRef(0);

  // Parse column types from CREATE TABLE statement
  const parseColumnTypes = useCallback((sql: string): Record<string, string> => {
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
  }, []);

  // Load danh sách tables
  const loadTables = useCallback(async () => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables');
      console.error('Load tables error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data của table được chọn
  const loadTableData = useCallback(async (tableName: string) => {
    if (!tableName) return;

    try {
      setLoading(true);
      setError(null);

      const rows = await db.execute(`SELECT rowid, * FROM ${tableName} LIMIT 1000`);

      let columns: string[] = [];
      let columnTypes: Record<string, string> = {};

      if (rows.length > 0) {
        columns = Object.keys(rows[0]).filter(col => col !== 'rowid');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load data from ${tableName}`);
      console.error('Load table data error:', err);
    } finally {
      setLoading(false);
    }
  }, [parseColumnTypes]);

  const addFilter = useCallback((column: string, operator: Operator, value: string) => {
    console.log('[useDatabase] addFilter called with:', { column, operator, value });
    // Cho phép thêm filter với giá trị trống, user có thể edit sau
    const newFilter = {
      id: `filter-${filterIdCounter.current++}`,
      column: column || '',
      operator,
      value: value || '',
    };
    console.log('[useDatabase] Adding filter:', newFilter);
    setFilters(prev => {
      console.log('[useDatabase] Previous filters:', prev.length);
      const updated = [...prev, newFilter];
      console.log('[useDatabase] Updated filters:', updated.length);
      return updated;
    });
  }, []);

  const removeFilter = useCallback((id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  // Apply filters to data
  const getFilteredRows = useCallback(() => {
    if (!tableData) return [];
    if (filters.length === 0) return tableData.rows;

    return tableData.rows.filter((row) => {
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
  }, [tableData, filters]);

  const deleteRecords = useCallback(async (rowIds: number[]) => {
    if (!selectedTable || rowIds.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const placeholders = rowIds.map(() => '?').join(',');
      await db.execute(
        `DELETE FROM ${selectedTable} WHERE rowid IN (${placeholders})`,
        rowIds,
      );

      // Refresh data after deletion
      await loadTableData(selectedTable);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete records');
      console.error('Delete records error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedTable, loadTableData]);

  const refresh = useCallback(async () => {
    await loadTables();
    if (selectedTable) {
      await loadTableData(selectedTable);
    }
  }, [loadTables, selectedTable, loadTableData]);

  // Load tables on mount
  useEffect(() => {
    loadTables();
  }, [loadTables]);

  // Load data when selected table changes
  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
      clearFilters();
    }
  }, [selectedTable, loadTableData, clearFilters]);

  return {
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
    loadTables,
    loadTableData,
    deleteRecords,
  };
}