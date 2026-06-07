/**
 * useEntityRecon — main hook for processing RECON data.
 * Parses raw JSON, runs entity disambiguation, and provides reactive state.
 */
import { useState, useMemo, useCallback } from 'react';
import type { ReconResult } from '../types/recon-result';
import type { ReconEntity } from '../types/entity';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { parseReconResult } from '../engine/recon-parser';
import { getDataPointsForGroup } from '../engine/smart-classifier';

interface UseEntityReconReturn {
  /** Full parsed result */
  result: ReconResult | null;
  /** All entities found */
  entities: ReconEntity[];
  /** Active category groups (tabs) */
  categoryGroups: SmartCategoryGroup[];
  /** Currently selected entity */
  selectedEntity: ReconEntity | null;
  /** Currently active tab */
  activeTab: string;
  /** Filtered data points for current tab + entity */
  filteredDataPoints: DataPoint[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: string | null;
  /** Load raw JSON data */
  loadData: (rawData: Record<string, unknown>) => void;
  /** Select an entity */
  selectEntity: (entityId: string | null) => void;
  /** Switch tab */
  setActiveTab: (tabId: string) => void;
  /** Filter data points by search query */
  searchDataPoints: (query: string) => DataPoint[];
  /** Get data points for a specific entity */
  getEntityDataPoints: (entityId: string) => DataPoint[];
  /** Get entity by ID */
  getEntityById: (entityId: string) => ReconEntity | undefined;
}

export function useEntityRecon(): UseEntityReconReturn {
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

  const filteredDataPoints = useMemo(() => {
    if (!result) return [];

    // Determine which data points to show
    let dps: DataPoint[];

    if (activeTab === 'overview') {
      dps = selectedEntity
        ? selectedEntity.dataPoints
        : result.allDataPoints;
    } else if (activeTab === 'entities') {
      dps = [];
    } else if (activeTab === 'relations') {
      dps = [];
    } else if (activeTab === 'sources') {
      dps = [];
    } else if (activeTab === 'timeline') {
      dps = (selectedEntity
        ? selectedEntity.dataPoints
        : result.allDataPoints
      )
        .filter(dp => dp.discoveredAt)
        .sort((a, b) => (a.discoveredAt || '').localeCompare(b.discoveredAt || ''));
    } else if (activeTab === 'raw') {
      dps = selectedEntity
        ? selectedEntity.dataPoints.filter(dp => dp.isNoise || dp.category === 'unclassified')
        : result.unassignedDataPoints;
    } else {
      const group = categoryGroups.find(g => g.id === activeTab);
      if (group) {
        const baseDps = selectedEntity
          ? selectedEntity.dataPoints
          : result.allDataPoints;
        dps = getDataPointsForGroup(baseDps, group);
      } else {
        dps = [];
      }
    }

    return dps;
  }, [result, selectedEntity, activeTab, categoryGroups]);

  const loadData = useCallback((rawData: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = parseReconResult(rawData);
      setResult(parsed);
      // Auto-select the primary entity
      const primary = parsed.entities.find(e => e.relevance === 'primary') || parsed.entities[0] || null;
      setSelectedEntityId(primary?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse RECON data');
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

  const getEntityDataPoints = useCallback((entityId: string): DataPoint[] => {
    if (!result) return [];
    const entity = result.entities.find(e => e.id === entityId);
    return entity?.dataPoints || [];
  }, [result]);

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
    getEntityDataPoints,
    getEntityById,
  };
}