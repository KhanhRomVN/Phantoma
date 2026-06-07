/**
 * Confidence Scorer — calculates confidence scores for data points and entities.
 * Multi-factor scoring based on source credibility, data consistency, and cross-validation.
 */
import type { DataPoint } from '../types/data-point';
import type { ReconEntity } from '../types/entity';
import type { DataSource } from '../types/source';

/**
 * Score a single data point based on multiple factors.
 */
export function scoreDataPoint(dp: DataPoint): DataPoint {
  let score = 0;
  let factors = 0;

  // Factor 1: Source credibility
  score += dp.source.credibility * 0.35;
  factors++;

  // Factor 2: Data completeness (more fields = higher confidence in extraction)
  if (dp.displayValue && dp.displayValue.length > 3) {
    score += 0.15;
  }
  if (dp.metadata && Object.keys(dp.metadata).length > 0) {
    score += 0.05;
  }
  factors++;

  // Factor 3: Category specificity (more specific categories have higher base confidence)
  const specificCategories = ['email', 'phone', 'ip_address', 'ssh_key', 'pgp_key', 'domain'];
  if (specificCategories.includes(dp.category)) {
    score += 0.2;
  }
  factors++;

  // Factor 4: Verification status
  if (dp.verificationStatus === 'verified') {
    score += 0.2;
  } else if (dp.verificationStatus === 'disputed') {
    score -= 0.15;
  }
  factors++;

  // Normalize
  dp.confidence = Math.max(0, Math.min(1, score / Math.max(factors, 1)));
  return dp;
}

/**
 * Score an entire entity based on its data points and identifiers.
 */
export function scoreEntity(entity: ReconEntity): ReconEntity {
  if (entity.dataPoints.length === 0) {
    entity.confidence = 0;
    return entity;
  }

  let score = 0;
  let factors = 0;

  // Factor 1: Average data point confidence
  const avgDpConfidence =
    entity.dataPoints.reduce((sum, dp) => sum + dp.confidence, 0) / entity.dataPoints.length;
  score += avgDpConfidence * 0.3;
  factors++;

  // Factor 2: Number of data points (more data = higher confidence in entity existence)
  const dpFactor = Math.min(entity.dataPoints.length / 20, 1); // Cap at 20
  score += dpFactor * 0.2;
  factors++;

  // Factor 3: Identifier diversity (multiple identifier types = stronger entity)
  const idTypes = new Set(entity.identifiers.map(id => id.type));
  const idDiversity = Math.min(idTypes.size / 5, 1); // Cap at 5 types
  score += idDiversity * 0.2;
  factors++;

  // Factor 4: Cross-source validation (data from multiple independent sources)
  const uniqueSources = new Set(entity.dataPoints.map(dp => dp.source.id));
  const sourceDiversity = Math.min(uniqueSources.size / 5, 1);
  score += sourceDiversity * 0.15;
  factors++;

  // Factor 5: Low noise ratio
  const noiseRatio = entity.dataPoints.filter(dp => dp.isNoise).length / entity.dataPoints.length;
  score += (1 - noiseRatio) * 0.15;
  factors++;

  entity.confidence = Math.max(0, Math.min(1, score / Math.max(factors, 1)));
  return entity;
}

/**
 * Score and rank all entities.
 */
export function scoreAllEntities(entities: ReconEntity[]): ReconEntity[] {
  return entities
    .map(scoreEntity)
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate risk score for an entity (0-100).
 * Based on leak exposure, darkweb mentions, credential types, etc.
 */
export function calculateRiskScore(entity: ReconEntity): number {
  let risk = 0;

  const categories = entity.dataPoints.map(dp => dp.category);

  // Critical: password leaks, credential leaks, stealer logs
  const criticalLeaks = categories.filter(c =>
    ['password_leak', 'credential_leak', 'stealer_log'].includes(c),
  ).length;
  risk += Math.min(criticalLeaks * 20, 40);

  // High: darkweb mentions, breach entries, pastebin
  const highRisk = categories.filter(c =>
    ['darkweb_mention', 'breach_entry', 'pastebin_entry'].includes(c),
  ).length;
  risk += Math.min(highRisk * 10, 25);

  // Medium: crypto addresses, exposed keys
  const mediumRisk = categories.filter(c =>
    ['crypto_address', 'api_key', 'ssh_key', 'pgp_key'].includes(c),
  ).length;
  risk += Math.min(mediumRisk * 5, 20);

  // Low: social media exposure
  const lowRisk = categories.filter(c =>
    ['social_profile', 'social_post'].includes(c),
  ).length;
  risk += Math.min(lowRisk * 2, 15);

  return Math.min(100, risk);
}