/**
 * Person-local entity disambiguator — groups data points into distinct entities.
 */
import type { DataPoint, DataSource } from '../../types/person/data-point';
import type { ReconEntity } from '../../types/person/entity';

interface DisambiguationResult {
  entities: ReconEntity[];
  unassigned: DataPoint[];
}

export function disambiguateEntities(
  dataPoints: DataPoint[],
  allSources: DataSource[],
): DisambiguationResult {
  const primaryDps: DataPoint[] = [];
  const secondaryDps: DataPoint[] = [];
  const noiseDps: DataPoint[] = [];

  for (const dp of dataPoints) {
    if (dp.isNoise) {
      noiseDps.push(dp);
    } else if (dp.tags?.includes('collision') || dp.tags?.includes('false-positive')) {
      secondaryDps.push(dp);
    } else {
      primaryDps.push(dp);
    }
  }

  const entities: ReconEntity[] = [];

  // Primary entity (target person)
  if (primaryDps.length > 0) {
    const primaryConfidence =
      primaryDps.reduce((sum, dp) => sum + dp.confidence, 0) / primaryDps.length;

    entities.push({
      id: 'entity-primary',
      displayName: 'Target Person',
      summary: `${primaryDps.length} data points from ${new Set(primaryDps.map((dp) => dp.source.name)).size} sources`,
      confidence: primaryConfidence,
      relevance: 'primary',
      dataPoints: primaryDps,
      sources: allSources,
    });
  }

  // Collision/uncertain entity
  if (secondaryDps.length > 0) {
    const secConfidence =
      secondaryDps.reduce((sum, dp) => sum + dp.confidence, 0) / secondaryDps.length;

    entities.push({
      id: 'entity-collision',
      displayName: 'Possible Collisions',
      summary: `${secondaryDps.length} data points potentially from username collisions or false positives`,
      confidence: secConfidence,
      relevance: 'secondary',
      dataPoints: secondaryDps,
      sources: allSources.filter((s) => secondaryDps.some((dp) => dp.source.id === s.id)),
    });
  }

  return {
    entities,
    unassigned: noiseDps,
  };
}