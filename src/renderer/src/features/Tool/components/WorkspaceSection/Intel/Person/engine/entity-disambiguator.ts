/**
 * Entity Disambiguator — clusters data points into distinct entities.
 * Uses shared identifiers (email, username, phone, domain) to group data points.
 * This is the core intelligence that separates noise from signal.
 */
import type { DataPoint } from '../types/data-point';
import type { ReconEntity, EntityIdentifier, EntityRelation, EntityType } from '../types/entity';
import type { DataSource } from '../types/source';
import { scoreAllEntities, calculateRiskScore } from './confidence-scorer';

let _entityCounter = 0;
function nextEntityId(): string {
  return `entity-${Date.now()}-${++_entityCounter}`;
}

/**
 * Main disambiguation function.
 * Takes all data points and returns clustered entities.
 */
export function disambiguateEntities(
  dataPoints: DataPoint[],
  sources: DataSource[],
): {
  entities: ReconEntity[];
  unassigned: DataPoint[];
} {
  if (dataPoints.length === 0) {
    return { entities: [], unassigned: [] };
  }

  // Step 1: Extract identifiers from all data points
  const identifierMap = extractIdentifiers(dataPoints);

  // Step 2: Build clusters based on shared identifiers
  const clusters = buildClusters(dataPoints, identifierMap);

  // Step 3: Convert clusters to entities
  const entities: ReconEntity[] = [];
  const assignedDpIds = new Set<string>();

  for (const cluster of clusters) {
    if (cluster.dataPoints.length === 0) continue;

    const entity = createEntityFromCluster(cluster);
    entities.push(entity);

    for (const dp of cluster.dataPoints) {
      assignedDpIds.add(dp.id);
    }
  }

  // Step 4: Collect unassigned data points
  const unassigned = dataPoints.filter(dp => !assignedDpIds.has(dp.id));
  // Mark unassigned as noise
  unassigned.forEach(dp => {
    dp.isNoise = true;
    dp.relevance = Math.min(dp.relevance, 0.2);
  });

  // Step 5: Score and rank entities
  const scoredEntities = scoreAllEntities(entities);

  // Step 6: Find relations between entities
  findEntityRelations(scoredEntities);

  // Step 7: Calculate risk scores
  scoredEntities.forEach(e => {
    e.riskScore = calculateRiskScore(e);
  });

  // Step 8: Determine relevance
  scoredEntities.forEach((e, i) => {
    if (i === 0 && e.confidence > 0.4) {
      e.relevance = 'primary';
    } else if (e.confidence > 0.3) {
      e.relevance = 'secondary';
    } else {
      e.relevance = 'noise';
    }
  });

  return { entities: scoredEntities, unassigned };
}

interface IdentifierIndex {
  type: EntityIdentifier['type'];
  value: string;
  dataPointIds: string[];
}

interface Cluster {
  dataPoints: DataPoint[];
  identifierIndices: IdentifierIndex[];
}

function extractIdentifiers(dataPoints: DataPoint[]): IdentifierIndex[] {
  const indexMap = new Map<string, IdentifierIndex>();

  for (const dp of dataPoints) {
    const identifiers = getIdentifiersFromDataPoint(dp);
    for (const id of identifiers) {
      const key = `${id.type}:${id.value.toLowerCase()}`;
      const existing = indexMap.get(key);
      if (existing) {
        existing.dataPointIds.push(dp.id);
      } else {
        indexMap.set(key, {
          type: id.type,
          value: id.value,
          dataPointIds: [dp.id],
        });
      }
    }
  }

  return Array.from(indexMap.values());
}

function getIdentifiersFromDataPoint(dp: DataPoint): EntityIdentifier[] {
  const ids: EntityIdentifier[] = [];

  switch (dp.category) {
    case 'email':
      ids.push({ type: 'email', value: String(dp.value), confidence: 0.9 });
      break;
    case 'username':
      ids.push({ type: 'username', value: String(dp.value), confidence: 0.6 });
      break;
    case 'phone':
      ids.push({ type: 'phone', value: String(dp.value), confidence: 0.7 });
      break;
    case 'full_name':
      ids.push({ type: 'full_name', value: String(dp.value), confidence: 0.5 });
      break;
    case 'alias':
      ids.push({ type: 'alias', value: String(dp.value), confidence: 0.4 });
      break;
    case 'domain':
      ids.push({ type: 'domain', value: String(dp.value), confidence: 0.5 });
      break;
    case 'social_profile': {
      const val = dp.value;
      if (typeof val === 'object' && val !== null) {
        const obj = val as Record<string, unknown>;
        if (obj.handle && typeof obj.handle === 'string') {
          ids.push({ type: 'social_handle', value: obj.handle, confidence: 0.5 });
        }
      } else {
        ids.push({ type: 'username', value: String(dp.value), confidence: 0.6 });
      }
      break;
    }
  }

  return ids;
}

function buildClusters(dataPoints: DataPoint[], identifierIndices: IdentifierIndex[]): Cluster[] {
  // Union-Find for clustering by shared identifiers
  const dpIdToIndex = new Map<string, number>();
  dataPoints.forEach((dp, i) => dpIdToIndex.set(dp.id, i));

  const parent = dataPoints.map((_, i) => i);
  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }

  // Union data points that share identifiers
  for (const idx of identifierIndices) {
    if (idx.dataPointIds.length < 2) continue;
    const indices = idx.dataPointIds
      .map(id => dpIdToIndex.get(id))
      .filter((i): i is number => i !== undefined);

    for (let i = 1; i < indices.length; i++) {
      union(indices[0], indices[i]);
    }
  }

  // Group by root
  const clusterMap = new Map<number, number[]>();
  dataPoints.forEach((_, i) => {
    const root = find(i);
    const group = clusterMap.get(root) || [];
    group.push(i);
    clusterMap.set(root, group);
  });

  // Build clusters
  const clusters: Cluster[] = [];
  for (const [, indices] of clusterMap) {
    const clusterDps = indices.map(i => dataPoints[i]);
    clusters.push({
      dataPoints: clusterDps,
      identifierIndices: extractIdentifiers(clusterDps),
    });
  }

  return clusters;
}

function createEntityFromCluster(cluster: Cluster): ReconEntity {
  const now = new Date().toISOString();

  // Determine entity type
  let entityType: EntityType = 'unknown';
  const categories = cluster.dataPoints.map(dp => dp.category);
  if (categories.some(c => ['company', 'domain', 'hosting'].includes(c))) {
    entityType = 'organization';
  } else if (categories.some(c => ['full_name', 'email', 'username'].includes(c))) {
    entityType = 'individual';
  } else if (categories.some(c => ['darkweb_mention', 'pastebin_entry'].includes(c))) {
    entityType = 'group';
  }

  // Build identifiers
  const identifiers: EntityIdentifier[] = cluster.identifierIndices.map(idx => ({
    type: idx.type,
    value: idx.value,
    confidence: 0.5,
  }));

  // Determine display name
  let displayName = 'Unknown Entity';
  const fullNameDp = cluster.dataPoints.find(dp => dp.category === 'full_name');
  const usernameDp = cluster.dataPoints.find(dp => dp.category === 'username');
  const emailDp = cluster.dataPoints.find(dp => dp.category === 'email');

  if (fullNameDp) {
    displayName = String(fullNameDp.value);
  } else if (usernameDp) {
    displayName = String(usernameDp.value);
  } else if (emailDp) {
    displayName = String(emailDp.value).split('@')[0];
  } else if (identifiers.length > 0) {
    displayName = identifiers[0].value;
  }

  // Build summary
  const summaryParts: string[] = [];
  const emailCount = categories.filter(c => c === 'email').length;
  const socialCount = categories.filter(c => c === 'social_profile').length;
  const leakCount = categories.filter(c => ['password_leak', 'credential_leak', 'stealer_log'].includes(c)).length;

  if (emailCount > 0) summaryParts.push(`${emailCount} email${emailCount > 1 ? 's' : ''}`);
  if (socialCount > 0) summaryParts.push(`${socialCount} social profile${socialCount > 1 ? 's' : ''}`);
  if (leakCount > 0) summaryParts.push(`${leakCount} leak${leakCount > 1 ? 's' : ''}`);
  summaryParts.push(`${cluster.dataPoints.length} data points`);

  // Extract avatar
  const avatarDp = cluster.dataPoints.find(dp => dp.category === 'avatar');
  const avatarUrl = avatarDp ? String(avatarDp.value) : undefined;

  // Extract location
  const locationDp = cluster.dataPoints.find(dp => dp.category === 'location');
  const estimatedLocation = locationDp ? String(locationDp.value) : undefined;

  // Extract bio
  const bioDp = cluster.dataPoints.find(dp => dp.category === 'bio');
  const bio = bioDp ? String(bioDp.value) : undefined;

  const entity: ReconEntity = {
    id: nextEntityId(),
    displayName,
    type: entityType,
    confidence: 0.5, // Will be scored later
    dataPointCount: cluster.dataPoints.length,
    identifiers,
    dataPoints: cluster.dataPoints.map(dp => ({ ...dp, entityId: nextEntityId() })),
    summary: summaryParts.join(' · '),
    tags: generateTags(cluster.dataPoints),
    relevance: 'unknown',
    discoveredAt: now,
    updatedAt: now,
    avatarUrl,
    bio,
    estimatedLocation,
  };

  // Fix entityId
  entity.dataPoints.forEach(dp => {
    dp.entityId = entity.id;
  });

  return entity;
}

function generateTags(dataPoints: DataPoint[]): string[] {
  const tags = new Set<string>();
  const categories = new Set(dataPoints.map(dp => dp.category));

  if (categories.has('email')) tags.add('has-email');
  if (categories.has('phone')) tags.add('has-phone');
  if (categories.has('social_profile')) tags.add('social-presence');
  if (categories.has('password_leak') || categories.has('credential_leak')) tags.add('breached');
  if (categories.has('darkweb_mention')) tags.add('darkweb');
  if (categories.has('domain')) tags.add('has-domains');
  if (categories.has('repository')) tags.add('developer');
  if (categories.has('public_key') || categories.has('ssh_key') || categories.has('pgp_key')) tags.add('crypto-keys');

  return Array.from(tags);
}

function findEntityRelations(entities: ReconEntity[]): void {
  for (let i = 0; i < entities.length; i++) {
    const relations: EntityRelation[] = [];
    const relatedIds: string[] = [];

    for (let j = 0; j < entities.length; j++) {
      if (i === j) continue;

      // Check for shared identifiers
      const aIds = new Set(entities[i].identifiers.map(id => `${id.type}:${id.value.toLowerCase()}`));
      const bIds = entities[j].identifiers.map(id => `${id.type}:${id.value.toLowerCase()}`);

      const shared = bIds.filter(id => aIds.has(id));
      if (shared.length > 0) {
        relations.push({
          targetEntityId: entities[j].id,
          relationType: 'same_person',
          confidence: Math.min(shared.length * 0.3, 1),
          evidence: `Shared identifiers: ${shared.join(', ')}`,
        });
        relatedIds.push(entities[j].id);
      }
    }

    entities[i].relations = relations;
    entities[i].relatedEntityIds = relatedIds;
  }
}