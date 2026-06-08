/**
 * Person-local confidence scorer — calculates confidence, relevance, and risk scores.
 */
import type { DataPoint } from '../types/data-point';
import type { ReconEntity } from '../types/entity';

/**
 * Score a single data point based on its source credibility, metadata signals, and noise flags.
 */
export function scoreDataPoint(dp: DataPoint): void {
  let confidence = dp.source.credibility;

  if (dp.isNoise) {
    confidence *= 0.3;
  }

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

  dp.confidence = Math.max(0, Math.min(1, confidence));

  let relevance = dp.isNoise ? 0.15 : 0.6;
  if (dp.tags?.includes('confirmed')) relevance += 0.25;
  if (dp.tags?.includes('primary-identity')) relevance += 0.2;
  if (dp.tags?.includes('high-risk')) relevance += 0.3;
  if (dp.tags?.includes('false-positive')) relevance = 0.1;
  if (dp.tags?.includes('collision')) relevance *= 0.4;
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
    const noise = dp.isNoise ? 0.2 : 1;
    const confidence = dp.confidence;
    const relevance = dp.relevance;

    const dpRisk = relevance * noise * (1 - confidence * 0.5) * 100;

    const criticalCategories = [
      'leak_password', 'leak_credential', 'leak_darkweb_mention',
      'identity_real_name', 'contact_phone', 'contact_address',
      'social_facebook', 'tech_ip_address',
    ];
    const categoryBonus = criticalCategories.includes(dp.category) ? 20 : 0;

    riskSum += dpRisk + categoryBonus;
    riskCount++;
  }

  const avgRisk = riskSum / riskCount;

  let entityRisk = avgRisk;

  if (entity.dataPoints.length > 30) entityRisk += 8;
  if (entity.relevance === 'primary') entityRisk += 5;
  if (entity.relevance === 'noise') entityRisk *= 0.3;

  return Math.round(Math.max(0, Math.min(100, entityRisk)));
}