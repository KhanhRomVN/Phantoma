/**
 * IP-local entity disambiguator — groups data points into distinct entities.
 */
import type { DataPoint, DataSource } from '../types/data-point';
import type { ReconEntity } from '../types/entity';

interface DisambiguationResult {
  entities: ReconEntity[];
  unassigned: DataPoint[];
}

/**
 * Group data points into logical entities based on shared attributes.
 * For IP recon: primary entity for target IP + entities for shared infrastructure artifacts.
 */
export function disambiguateEntities(
  dataPoints: DataPoint[],
  allSources: DataSource[],
): DisambiguationResult {
  const primaryDps: DataPoint[] = [];
  const noiseDps: DataPoint[] = [];
  const unrelatedDps: DataPoint[] = [];

  for (const dp of dataPoints) {
    if (dp.isNoise) {
      noiseDps.push(dp);
    } else if (dp.tags?.includes('shared-infra') || dp.tags?.includes('unrelated-domain')) {
      unrelatedDps.push(dp);
    } else {
      primaryDps.push(dp);
    }
  }

  const entities: ReconEntity[] = [];

  // Primary entity (target IP)
  if (primaryDps.length > 0) {
    const primaryConfidence =
      primaryDps.reduce((sum, dp) => sum + dp.confidence, 0) / primaryDps.length;

    entities.push({
      id: 'entity-primary',
      displayName: 'Target IP',
      summary: `${primaryDps.length} data points from ${new Set(primaryDps.map((dp) => dp.source.name)).size} sources`,
      confidence: primaryConfidence,
      relevance: 'primary',
      dataPoints: primaryDps,
      sources: allSources,
    });
  }

  // Shared infrastructure entity
  if (unrelatedDps.length > 0) {
    const unrelatedConfidence =
      unrelatedDps.reduce((sum, dp) => sum + dp.confidence, 0) / unrelatedDps.length;

    entities.push({
      id: 'entity-shared',
      displayName: 'Shared Infrastructure Artifacts',
      summary: `${unrelatedDps.length} data points from shared hosting/CDN — likely unrelated`,
      confidence: unrelatedConfidence,
      relevance: 'secondary',
      dataPoints: unrelatedDps,
      sources: allSources.filter((s) => unrelatedDps.some((dp) => dp.source.id === s.id)),
    });
  }

  return {
    entities,
    unassigned: noiseDps,
  };
}