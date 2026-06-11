/**
 * useNetworkScan — main hook for processing active network scan data.
 */
import { useState, useMemo, useCallback } from 'react';
import type { ScanResult, SmartCategoryGroup } from '../types/scan-result';
import type { DataPoint } from '../types/scan-data-point';
import { parseScanResult } from '../utils/scan-parser';

interface UseNetworkScanReturn {
  result: ScanResult | null;
  categoryGroups: SmartCategoryGroup[];
  activeTab: string;
  filteredDataPoints: DataPoint[];
  isLoading: boolean;
  error: string | null;
  loadData: (rawData: Record<string, unknown>) => void;
  setActiveTab: (tabId: string) => void;
  searchDataPoints: (query: string) => DataPoint[];
  getDataPointsForTab: (tabId: string) => DataPoint[];
}

export function useNetworkScan(): UseNetworkScanReturn {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [activeTab, setActiveTabState] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryGroups = useMemo(
    () => result?.activeCategoryGroups || [],
    [result],
  );

  const loadData = useCallback((rawData: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = parseScanResult(rawData);
      setResult(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse scan data');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabState(tabId);
  }, []);

  const searchDataPoints = useCallback(
    (query: string): DataPoint[] => {
      if (!result || !query.trim()) return [];
      const lower = query.toLowerCase();
      return result.allDataPoints.filter((dp) => {
        const label = dp.label.toLowerCase();
        const displayVal = (dp.displayValue || '').toLowerCase();
        const val = String(dp.value || '').toLowerCase();
        const source = dp.source.name.toLowerCase();
        return (
          label.includes(lower) ||
          displayVal.includes(lower) ||
          val.includes(lower) ||
          source.includes(lower)
        );
      });
    },
    [result],
  );

  const getDataPointsForTab = useCallback(
    (tabId: string): DataPoint[] => {
      if (!result) return [];

      if (tabId === 'overview') return result.allDataPoints;
      if (tabId === 'sources') return [];
      if (tabId === 'raw') {
        return result.allDataPoints.filter(
          (dp) => dp.isNoise || dp.category === 'unclassified',
        );
      }

      const group = categoryGroups.find((g) => g.id === tabId);
      if (!group) return [];

      return result.allDataPoints.filter((dp) =>
        group.categories.includes(dp.category),
      );
    },
    [result, categoryGroups],
  );

  const filteredDataPoints = useMemo(() => {
    if (!result) return [];
    return getDataPointsForTab(activeTab);
  }, [result, activeTab, getDataPointsForTab]);

  return {
    result,
    categoryGroups,
    activeTab,
    filteredDataPoints,
    isLoading,
    error,
    loadData,
    setActiveTab,
    searchDataPoints,
    getDataPointsForTab,
  };
}