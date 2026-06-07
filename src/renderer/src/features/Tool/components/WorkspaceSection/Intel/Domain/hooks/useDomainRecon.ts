/**
 * useDomainRecon — main hook for processing Domain RECON data.
 * Reuses the entity recon pattern from Person module.
 */
import { useState, useMemo, useCallback } from 'react';
import type { ReconResult } from '../../Person/types/recon-result';
import type { ReconEntity } from '../../Person/types/entity';
import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { parseDomainReconResult } from '../engine/domain-parser';

interface UseDomainReconReturn {
  result: ReconResult | null;
  entities: ReconEntity[];
  categoryGroups: SmartCategoryGroup[];
  selectedEntity: ReconEntity | null;
  activeTab: string;
  filteredDataPoints: DataPoint[];
  isLoading: boolean;
  error: string | null;
  loadData: (rawData: Record<string, unknown>) => void;
  selectEntity: (entityId: string | null) => void;
  setActiveTab: (tabId: string) => void;
  searchDataPoints: (query: string) => DataPoint[];
  getDataPointsForTab: (tabId: string) => DataPoint[];
  getEntityById: (entityId: string) => ReconEntity | undefined;
}

export function useDomainRecon(): UseDomainReconReturn {
  const [result, setResult] = useState<ReconResult | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [activeTab, setActiveTabState] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entities = useMemo(() => result?.entities || [], [result]);
  const categoryGroups = useMemo(() => result?.activeCategoryGroups || [], [result]);

  const selectedEntity = useMemo(() => {
    if (!selectedEntityId || !result) return null;
    return result.entities.find(e => e.id === selectedEntityId) || null;
  }, [selectedEntityId, result]);

  const loadData = useCallback((rawData: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = parseDomainReconResult(rawData);
      setResult(parsed);
      const primary = parsed.entities.find(e => e.relevance === 'primary') || parsed.entities[0] || null;
      setSelectedEntityId(primary?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse domain RECON data');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectEntity = useCallback((entityId: string | null) => {
    setSelectedEntityId(entityId);
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabState(tabId);
  }, []);

  const searchDataPoints = useCallback((query: string): DataPoint[] => {
    if (!result || !query.trim()) return [];
    const lower = query.toLowerCase();
    return result.allDataPoints.filter(dp => {
      const label = dp.label.toLowerCase();
      const displayVal = (dp.displayValue || '').toLowerCase();
      const val = String(dp.value || '').toLowerCase();
      const source = dp.source.name.toLowerCase();
      return label.includes(lower) || displayVal.includes(lower) || val.includes(lower) || source.includes(lower);
    });
  }, [result]);

  const getDataPointsForTab = useCallback((tabId: string): DataPoint[] => {
    if (!result) return [];

    const baseDps = selectedEntity
      ? selectedEntity.dataPoints
      : result.allDataPoints;

    if (tabId === 'overview') return baseDps;
    if (tabId === 'timeline') {
      return baseDps
        .filter(dp => dp.discoveredAt)
        .sort((a, b) => (a.discoveredAt || '').localeCompare(b.discoveredAt || ''));
    }
    if (tabId === 'raw') {
      return selectedEntity
        ? selectedEntity.dataPoints.filter(dp => dp.isNoise || dp.category === 'unclassified')
        : result.unassignedDataPoints;
    }
    if (tabId === 'sources') return [];

    const group = categoryGroups.find(g => g.id === tabId);
    if (!group) return [];

    return baseDps.filter(dp => group.categories.includes(dp.category));
  }, [result, selectedEntity, categoryGroups]);

  const filteredDataPoints = useMemo(() => {
    if (!result) return [];
    return getDataPointsForTab(activeTab);
  }, [result, activeTab, selectedEntityId, getDataPointsForTab]);

  const getEntityById = useCallback((entityId: string): ReconEntity | undefined => {
    return result?.entities.find(e => e.id === entityId);
  }, [result]);

  return {
    result,
    entities,
    categoryGroups,
    selectedEntity,
    activeTab,
    filteredDataPoints,
    isLoading,
    error,
    loadData,
    selectEntity,
    setActiveTab,
    searchDataPoints,
    getDataPointsForTab,
    getEntityById,
  };
}