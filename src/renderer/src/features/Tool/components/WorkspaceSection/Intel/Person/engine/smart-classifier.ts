/**
 * Smart Classifier — automatically categorizes DataPoints into SmartCategoryGroups.
 * Uses pattern matching, heuristics, and content analysis.
 */
import type { DataPoint, DataCategory } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { CATEGORY_GROUP_DEFINITIONS } from '../types/smart-category';

/**
 * Classify all data points into active category groups.
 * Only groups that have matching data points will be active.
 */
export function classifyDataPoints(dataPoints: DataPoint[]): SmartCategoryGroup[] {
  const categoryCounts = new Map<DataCategory, number>();

  // Count data points per category
  for (const dp of dataPoints) {
    const count = categoryCounts.get(dp.category) || 0;
    categoryCounts.set(dp.category, count + 1);
  }

  // Build active groups
  const activeGroups: SmartCategoryGroup[] = [];

  for (const def of CATEGORY_GROUP_DEFINITIONS) {
    let count = 0;

    if (def.id === 'overview') {
      count = dataPoints.length;
    } else if (def.id === 'entities') {
      // Entity count is handled separately by the disambiguator
      count = 0;
    } else if (def.id === 'timeline') {
      // Timeline: count data points with timestamps
      count = dataPoints.filter(dp => dp.discoveredAt).length;
    } else if (def.id === 'relations') {
      // Relations: handled by entity relations
      count = 0;
    } else if (def.id === 'sources') {
      // Sources: count unique sources
      const uniqueSources = new Set(dataPoints.map(dp => dp.source.id));
      count = uniqueSources.size;
    } else {
      // Count by matching categories
      for (const cat of def.categories) {
        count += categoryCounts.get(cat) || 0;
      }
    }

    // Special groups always show
    const alwaysShow = ['overview', 'entities', 'raw', 'sources'].includes(def.id);

    activeGroups.push({
      ...def,
      isActive: alwaysShow || count > 0,
      count,
    });
  }

  // Sort by priority
  activeGroups.sort((a, b) => a.priority - b.priority);

  return activeGroups;
}

/**
 * Get data points filtered by a specific category group.
 */
export function getDataPointsForGroup(
  dataPoints: DataPoint[],
  group: SmartCategoryGroup,
): DataPoint[] {
  if (group.id === 'overview' || group.id === 'sources') {
    return dataPoints;
  }
  if (group.id === 'entities' || group.id === 'relations') {
    return [];
  }
  if (group.id === 'timeline') {
    return dataPoints
      .filter(dp => dp.discoveredAt)
      .sort((a, b) => (a.discoveredAt || '').localeCompare(b.discoveredAt || ''));
  }
  if (group.id === 'raw') {
    return dataPoints.filter(dp =>
      dp.category === 'other' || dp.category === 'unclassified' || dp.isNoise,
    );
  }
  return dataPoints.filter(dp => group.categories.includes(dp.category));
}

/**
 * Suggest additional categories based on data content patterns.
 * Can expand the category system dynamically.
 */
export function suggestNewCategories(dataPoints: DataPoint[]): {
  suggestedCategory: string;
  count: number;
  sampleValues: unknown[];
}[] {
  const unclassified = dataPoints.filter(dp => dp.category === 'unclassified');
  if (unclassified.length < 3) return [];

  // Group by value type patterns
  const patterns = new Map<string, { count: number; samples: unknown[] }>();

  for (const dp of unclassified) {
    const val = dp.value;
    let pattern = 'unknown';

    if (typeof val === 'string') {
      if (val.includes('court')) pattern = 'legal_document';
      else if (val.includes('passport')) pattern = 'travel_document';
      else if (val.includes('wikipedia')) pattern = 'wiki_entry';
      else if (val.includes('news')) pattern = 'news_article';
      else if (/^\d{4}-\d{2}-\d{2}/.test(val)) pattern = 'dated_entry';
    }

    const existing = patterns.get(pattern) || { count: 0, samples: [] };
    existing.count++;
    if (existing.samples.length < 3) existing.samples.push(val);
    patterns.set(pattern, existing);
  }

  return Array.from(patterns.entries())
    .filter(([, v]) => v.count >= 2)
    .map(([k, v]) => ({
      suggestedCategory: k,
      count: v.count,
      sampleValues: v.samples,
    }));
}