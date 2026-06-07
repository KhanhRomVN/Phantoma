/**
 * RECON Parser — transforms raw JSON output from RECON tools into structured ReconResult.
 * This is the main entry point: takes the realistic mock data, runs normalization,
 * disambiguation, classification, and produces the final result.
 */
import type { ReconResult } from '../types/recon-result';
import type { DataPoint } from '../types/data-point';
import type { DataSource } from '../types/source';
import { normalizeDataItem } from './data-normalizer';
import { disambiguateEntities } from './entity-disambiguator';
import { classifyDataPoints } from './smart-classifier';
import { scoreDataPoint } from './confidence-scorer';

/**
 * Parse raw RECON JSON into a structured ReconResult.
 */
export function parseReconResult(rawData: Record<string, unknown>): ReconResult {
  const allDataPoints: DataPoint[] = [];
  const allSources: DataSource[] = [];
  const sourceMap = new Map<string, DataSource>();

  // Extract query info
  const query = (rawData.query as { value: string; type: 'name' | 'email' | 'username' | 'phone' | 'domain' }) || {
    value: 'Unknown',
    type: 'name' as const,
  };

  // Extract scan metadata
  const scanRaw = rawData.scan as Record<string, unknown> || {};
  const scan = {
    startedAt: String(scanRaw.startedAt || new Date().toISOString()),
    completedAt: String(scanRaw.completedAt || new Date().toISOString()),
    duration: Number(scanRaw.duration || 0),
    totalRawHits: Number(scanRaw.totalRawHits || 0),
    totalProcessedHits: Number(scanRaw.totalProcessedHits || 0),
  };

  // Process raw data blocks
  const rawDataBlocks = rawData.rawData as Array<Record<string, unknown>> || [];

  for (const block of rawDataBlocks) {
    const sourceName = String(block.source || 'Unknown Source');
    const sourceType = String(block.type || 'other');
    const items = block.items as unknown[] || [];

    // Create or get source
    let source: DataSource;
    const sourceKey = sourceName;
    if (sourceMap.has(sourceKey)) {
      source = sourceMap.get(sourceKey)!;
    } else {
      source = {
        id: `src-${sourceName.toLowerCase().replace(/\s+/g, '-')}`,
        name: sourceName,
        type: sourceType as DataSource['type'],
        credibility: estimateSourceCredibility(sourceName, sourceType),
      };
      sourceMap.set(sourceKey, source);
      allSources.push(source);
    }

    // Normalize each item
    for (const item of items) {
      if (typeof item === 'string') {
        const dp = normalizeDataItem(item, source);
        if (dp) {
          scoreDataPoint(dp);
          allDataPoints.push(dp);
        }
      } else if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        // Check if it has sub-items
        if (Array.isArray(obj.items)) {
          for (const subItem of obj.items) {
            const dp = normalizeDataItem(subItem, source);
            if (dp) {
              scoreDataPoint(dp);
              allDataPoints.push(dp);
            }
          }
        } else {
          // Flatten object into data points
          const flattened = flattenObjectItem(obj, source);
          for (const dp of flattened) {
            scoreDataPoint(dp);
            allDataPoints.push(dp);
          }
        }
      }
    }
  }

  // Run entity disambiguation
  const { entities, unassigned } = disambiguateEntities(allDataPoints, allSources);

  // Classify data points into category groups
  const activeCategoryGroups = classifyDataPoints(allDataPoints);

  // Calculate overall confidence
  const overallConfidence = entities.length > 0
    ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
    : 0;

  // Extract warnings
  const warnings = (rawData.warnings as string[]) || [];

  const result: ReconResult = {
    query,
    scan,
    entities,
    allDataPoints,
    unassignedDataPoints: unassigned,
    sources: allSources,
    activeCategoryGroups,
    overallConfidence,
    warnings,
  };

  return result;
}

/**
 * Flatten a complex object into individual DataPoints.
 */
function flattenObjectItem(obj: Record<string, unknown>, source: DataSource): DataPoint[] {
  const dps: DataPoint[] = [];

  // Known field mappings
  const fieldMappings: Array<{ keys: string[]; handler: (val: unknown) => DataPoint | null }> = [
    {
      keys: ['email'],
      handler: (val) => normalizeDataItem(val, source, 'email'),
    },
    {
      keys: ['username', 'handle', 'user'],
      handler: (val) => normalizeDataItem(val, source, 'username'),
    },
    {
      keys: ['fullName', 'full_name', 'displayName', 'display_name', 'name'],
      handler: (val) => normalizeDataItem(val, source, 'full_name'),
    },
    {
      keys: ['phone', 'phoneNumber', 'phone_number', 'tel'],
      handler: (val) => normalizeDataItem(val, source, 'phone'),
    },
    {
      keys: ['domain'],
      handler: (val) => normalizeDataItem(val, source, 'domain'),
    },
    {
      keys: ['ip', 'ip_address', 'ipAddress'],
      handler: (val) => normalizeDataItem(val, source, 'ip_address'),
    },
    {
      keys: ['location', 'country', 'city'],
      handler: (val) => normalizeDataItem(val, source, 'location'),
    },
    {
      keys: ['bio', 'description', 'about'],
      handler: (val) => normalizeDataItem(val, source, 'bio'),
    },
    {
      keys: ['title', 'job_title', 'jobTitle'],
      handler: (val) => normalizeDataItem(val, source, 'job_title'),
    },
    {
      keys: ['company', 'organization', 'org'],
      handler: (val) => normalizeDataItem(val, source, 'company'),
    },
    {
      keys: ['education', 'school', 'university'],
      handler: (val) => normalizeDataItem(val, source, 'education'),
    },
    {
      keys: ['breaches', 'breach'],
      handler: (val) => {
        if (Array.isArray(val)) {
          return normalizeDataItem(`Breaches: ${val.join(', ')}`, source, 'breach_entry');
        }
        return normalizeDataItem(String(val), source, 'breach_entry');
      },
    },
    {
      keys: ['passwords_found', 'hashes'],
      handler: (val) => normalizeDataItem(String(val), source, 'password_leak'),
    },
    {
      keys: ['context', 'preview', 'excerpt'],
      handler: (val) => normalizeDataItem(String(val).substring(0, 300), source, 'unclassified'),
    },
  ];

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    let handled = false;
    for (const mapping of fieldMappings) {
      if (mapping.keys.includes(key)) {
        const dp = mapping.handler(value);
        if (dp) {
          // Add metadata from parent object
          dp.metadata = {
            ...dp.metadata,
            originalObject: obj,
          };
          dps.push(dp);
          handled = true;
          break;
        }
      }
    }

    // Handle social-specific fields
    if (!handled) {
      if (key === 'followers' || key === 'subscribers' || key === 'karma' || key === 'rating') {
        const dp = normalizeDataItem(`${key}: ${value}`, source, 'social_profile');
        if (dp) {
          dp.metadata = { originalObject: obj };
          dps.push(dp);
          handled = true;
        }
      }
      if (key === 'repos' || key === 'contributions') {
        const dp = normalizeDataItem(`${key}: ${value}`, source, 'repository');
        if (dp) {
          dp.metadata = { originalObject: obj };
          dps.push(dp);
          handled = true;
        }
      }
      if (key === 'genre' || key === 'specialty' || key === 'service') {
        const dp = normalizeDataItem(String(value), source, 'unclassified');
        if (dp) {
          dp.label = key;
          dp.metadata = { originalObject: obj };
          dps.push(dp);
          handled = true;
        }
      }
    }

    // Catch-all: treat as unclassified
    if (!handled && typeof value === 'string' && value.length > 0) {
      const dp = normalizeDataItem(value, source, 'unclassified');
      if (dp) {
        dp.label = key;
        dp.metadata = { originalObject: obj };
        dps.push(dp);
      }
    }
  }

  return dps;
}

/**
 * Estimate source credibility based on source name and type.
 */
function estimateSourceCredibility(name: string, type: string): number {
  const nameLower = name.toLowerCase();

  // High credibility
  if (nameLower.includes('haveibeenpwned') || nameLower.includes('dehashed')) return 0.9;
  if (nameLower.includes('whois') || nameLower.includes('shodan')) return 0.85;
  if (nameLower.includes('github') || nameLower.includes('gitlab')) return 0.8;
  if (nameLower.includes('linkedin')) return 0.7;
  if (nameLower.includes('ctftime')) return 0.75;

  // Medium credibility
  if (nameLower.includes('twitter') || nameLower.includes('reddit')) return 0.5;
  if (nameLower.includes('instagram') || nameLower.includes('tiktok')) return 0.4;
  if (nameLower.includes('google')) return 0.6;

  // Low credibility
  if (nameLower.includes('pastebin') || nameLower.includes('rentry')) return 0.3;
  if (nameLower.includes('breachforums') || nameLower.includes('darkweb')) return 0.35;
  if (nameLower.includes('fiverr') || nameLower.includes('steam')) return 0.4;

  // Default
  switch (type) {
    case 'breach_database': return 0.8;
    case 'domain_whois': return 0.85;
    case 'dns_record': return 0.8;
    case 'social_media': return 0.5;
    case 'code_platform': return 0.7;
    case 'darkweb': return 0.3;
    case 'pastebin': return 0.25;
    case 'search_engine': return 0.5;
    default: return 0.4;
  }
}