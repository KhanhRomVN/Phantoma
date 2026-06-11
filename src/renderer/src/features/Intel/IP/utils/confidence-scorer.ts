/**
 * IP-local confidence scorer — calculates confidence, relevance, and risk scores.
 */
import type { DataPoint } from '../types/data-point';
import type { ReconEntity } from '../types/entity';

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
  if (dp.tags?.includes('confirmed')) relevance += 0.25;
  if (dp.tags?.includes('target-domain')) relevance += 0.2;
  if (dp.tags?.includes('critical-risk')) relevance += 0.3;
  if (dp.tags?.includes('false-positive')) relevance = 0.1;
  if (dp.tags?.includes('shared-infra')) relevance *= 0.5;
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

    // Bonus for critical categories
    const criticalCategories = [
      'malware_association', 'phishing_association', 'c2_communication',
      'brute_force', 'ddos_participant', 'exploit_listing',
      'darkweb_mention', 'malware_url',
    ];
    const categoryBonus = criticalCategories.includes(dp.category) ? 25 : 0;

    riskSum += dpRisk + categoryBonus;
    riskCount++;
  }

  const avgRisk = riskSum / riskCount;

  let entityRisk = avgRisk;

  if (entity.dataPoints.length > 50) entityRisk += 10;
  if (entity.relevance === 'primary') entityRisk += 5;
  if (entity.relevance === 'noise') entityRisk *= 0.3;

  return Math.round(Math.max(0, Math.min(100, entityRisk)));
}