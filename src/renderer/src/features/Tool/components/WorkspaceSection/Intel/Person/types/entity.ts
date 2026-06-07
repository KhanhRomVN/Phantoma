import type { DataPoint } from './data-point';

/**
 * A distinct person/entity discovered during RECON.
 * Multiple entities may be found for a single name query.
 * Each entity is a cluster of related data points.
 */
export interface ReconEntity {
  /** Unique entity identifier */
  id: string;
  /** Display name (best guess from available data) */
  displayName: string;
  /** Entity type */
  type: EntityType;
  /** Overall confidence that this is a distinct entity (0-1) */
  confidence: number;
  /** How many data points are clustered into this entity */
  dataPointCount: number;
  /** Key identifiers that define this entity */
  identifiers: EntityIdentifier[];
  /** All data points belonging to this entity */
  dataPoints: DataPoint[];
  /** Summary of what's known */
  summary: string;
  /** Risk score (0-100) based on leaks, darkweb presence, etc. */
  riskScore?: number;
  /** Tags describing this entity */
  tags: string[];
  /** Whether this entity is the primary target or noise */
  relevance: 'primary' | 'secondary' | 'noise' | 'unknown';
  /** When this entity was first discovered */
  discoveredAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Avatar/profile image URL if found */
  avatarUrl?: string;
  /** Brief bio/summary */
  bio?: string;
  /** Estimated location */
  estimatedLocation?: string;
  /** Related entity IDs (connections between entities) */
  relatedEntityIds?: string[];
  /** Relation types */
  relations?: EntityRelation[];
}

export interface EntityIdentifier {
  type: 'email' | 'username' | 'phone' | 'full_name' | 'alias' | 'domain' | 'social_handle';
  value: string;
  confidence: number;
}

export interface EntityRelation {
  targetEntityId: string;
  relationType: 'same_person' | 'colleague' | 'family' | 'friend' | 'organization' | 'unknown';
  confidence: number;
  evidence: string;
}

export type EntityType =
  | 'individual'
  | 'organization'
  | 'group'
  | 'brand'
  | 'bot'
  | 'unknown';