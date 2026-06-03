import { SeverityLevel } from '../types/types'

export const SEVERITY_CLASS: Record<SeverityLevel, string> = {
  CRITICAL: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  HIGH:     'bg-red-500/15 text-red-400 border border-red-500/30',
  MEDIUM:   'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  LOW:      'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25',
}

export const CVSS_COLOR = (score: number): string => {
  if (score >= 9) return 'text-purple-400'
  if (score >= 7) return 'text-red-400'
  if (score >= 4) return 'text-amber-400'
  return 'text-cyan-400'
}

export const CVSS_STROKE = (score: number): string => {
  if (score >= 9) return '#a855f7'
  if (score >= 7) return '#ef4444'
  if (score >= 4) return '#f59e0b'
  return '#22d3ee'
}
