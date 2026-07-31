/**
 * Network scan confidence scorer for data points.
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
  if (dp.tags?.includes('host_up')) relevance += 0.3;
  if (dp.tags?.includes('port_open')) relevance += 0.4;
  if (dp.tags?.includes('service_critical')) relevance += 0.2;
  if (dp.tags?.includes('os_high_accuracy') && dp.metadata?.accuracy && typeof dp.metadata.accuracy === 'number' && dp.metadata.accuracy > 90) relevance += 0.2;

  dp.relevance = Math.max(0, Math.min(1, relevance));
}