import { useState, useEffect, useCallback, useRef } from 'react';
import { targetService } from '../../../services/TargetService';
import { TableInfo, TableData, FilterCondition, Operator } from '../types/database';

export function useDatabase() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const filterIdCounter = useRef(0);

  // Load danh sách tables (now returns fixed list from API)
  const loadTables = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Server-managed database — expose available endpoints as "tables"
      setTables([
        { name: 'emulate_targets', sql: 'REST API: GET /api/v1/emulate-targets' },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables');
      console.error('Load tables error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data từ API server
  const loadTableData = useCallback(async (tableName: string) => {
    if (!tableName) return;

    try {
      setLoading(true);
      setError(null);

      if (tableName === 'emulate_targets') {
        const targets = await targetService.getTargets();
        console.log('[useDatabase] targets data:', targets);

        if (targets.length > 0) {
          const columns = Object.keys(targets[0]).filter(col => col !== 'rowid');
          const columnTypes: Record<string, string> = {};

          // Infer types from values
          columns.forEach((col) => {
            const sampleVal = targets[0][col as keyof typeof targets[0]];
            if (sampleVal === null || sampleVal === undefined) {
              columnTypes[col] = 'TEXT';
            } else if (typeof sampleVal === 'number') {
              columnTypes[col] = 'INTEGER';
            } else if (typeof sampleVal === 'boolean') {
              columnTypes[col] = 'BOOLEAN';
            } else {
              columnTypes[col] = 'TEXT';
            }
          });

          // Map API id to rowid for table compatibility
          const rows = targets.map((t: any) => ({
            ...t,
            rowid: t.id,
          }));

          setTableData({
            columns,
            columnTypes,
            rows: rows as Record<string, any>[],
          });
        } else {
          // Empty table — try to infer columns from a known schema
          const columns = ['id', 'url', 'status', 'created_at', 'updated_at'];
          const columnTypes: Record<string, string> = {
            id: 'TEXT',
            url: 'TEXT',
            status: 'TEXT',
            created_at: 'TEXT',
            updated_at: 'TEXT',
          };
          setTableData({
            columns,
            columnTypes,
            rows: [],
          });
        }
      } else {
        setTableData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load data from ${tableName}`);
      console.error('Load table data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addFilter = useCallback((column: string, operator: Operator, value: string) => {
    const newFilter = {
      id: `filter-${filterIdCounter.current++}`,
      column: column || '',
      operator,
      value: value || '',
    };
    setFilters(prev => [...prev, newFilter]);
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

      if (selectedTable === 'emulate_targets') {
        // Delete each target via API
        for (const id of rowIds) {
          await targetService.deleteTarget(String(id));
        }
      }

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