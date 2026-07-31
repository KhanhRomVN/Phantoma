/**
 * Scan-local confidence scorer for active scan data points.
 */
import type { DataPoint } from '../types/scan-data-point';

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

  let relevance = dp.isNoise ? 0.1 : 0.6;
  if (dp.tags?.includes('zone-transfer')) relevance += 0.3;
  if (dp.tags?.includes('internal') || dp.tags?.includes('rfc1918')) relevance += 0.2;
  if (dp.tags?.includes('misconfig')) {
    if (dp.severity === 'critical' || dp.severity === 'high') relevance += 0.3;
    else relevance += 0.15;
  }
  if (dp.tags?.includes('wildcard')) relevance = 0.05;
  if (dp.tags?.includes('nxdomain')) relevance = 0.15;
  dp.relevance = Math.max(0, Math.min(1, relevance));
}