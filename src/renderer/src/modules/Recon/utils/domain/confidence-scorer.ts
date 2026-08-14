/**
 * Domain-local confidence scorer — calculates confidence, relevance, and risk scores.
 */
import type { DataPoint } from '../../types/domain/data-point';
import type { ReconEntity } from '../../types/domain/entity';

/**
 * Score a single data point based on its source credibility, metadata signals, and noise flags.
 */
export function scoreDataPoint(dp: DataPoint): void {
  // Base confidence from source credibility
  let confidence = dp.source.credibility;

  // Adjust for noise flags
  if (dp.isNoise) {
    confidence *= 0.3;
  }

  // Adjust for verification status
  switch (dp.verificationStatus) {
    case 'verified':
      confidence = Math.min(1, confidence * 1.2);
      break;
    case 'disputed':
      confidence *= 0.4;
      break;
    case 'pending':
      confidence *= 0.85;
      break;
  }

  // Clamp
  dp.confidence = Math.max(0, Math.min(1, confidence));

  // Calculate relevance based on noise and tags
  let relevance = dp.isNoise ? 0.15 : 0.6;
  if (dp.tags?.includes('internal')) relevance += 0.15;
  if (dp.tags?.includes('takeover-risk')) relevance += 0.25;
  if (dp.tags?.includes('confirmed-exposure')) relevance += 0.3;
  if (dp.tags?.includes('false-positive')) relevance = 0.1;
  dp.relevance = Math.max(0, Math.min(1, relevance));
}

/**
 * Calculate aggregate risk score for an entity based on its data points.
 */
export function calculateRiskScore(entity: ReconEntity): number {
  if (entity.dataPoints.length === 0) return 0;

  let riskSum = 0;
  let riskCount = 0;

  for (const dp of entity.dataPoints) {
    // Individual data point risk
    const noise = dp.isNoise ? 0.2 : 1;
    const confidence = dp.confidence;
    const relevance = dp.relevance;

    // Higher risk = high relevance + low noise + low confidence (uncertain but relevant findings are risky)
    const dpRisk = relevance * noise * (1 - confidence * 0.5) * 100;

    // Bonus for sensitive categories
    const sensitiveCategories = [
      'env_exposure',
      'git_exposure',
      'exposed_api_key',
      'exposed_secret_token',
      'admin_panel',
      'database_dump',
      'source_code_exposure',
      'subdomain_takeover',
    ];
    const categoryBonus = sensitiveCategories.includes(dp.category) ? 25 : 0;

    riskSum += dpRisk + categoryBonus;
    riskCount++;
  }

  const avgRisk = riskSum / riskCount;

  // Entity-level modifiers
  let entityRisk = avgRisk;

  // More data points = potentially higher risk surface
  if (entity.dataPoints.length > 50) entityRisk += 10;
  if (entity.relevance === 'primary') entityRisk += 5;
  if (entity.relevance === 'noise') entityRisk *= 0.3;

  return Math.round(Math.max(0, Math.min(100, entityRisk)));
}
