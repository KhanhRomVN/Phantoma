// ============================================================================
// CrackTab — Password cracking job tracking
// ============================================================================

import type { CrackJob } from '../../types';
import { STATUS_STYLE, CRACK_MODE_COLORS } from '../../constants';
import { progressBar, fmtTime, fmtNum } from '../../utils';
import { Btn } from '../shared/Btn';
import { $ } from '@renderer/utils/color';

// Helper function to resolve color from CSS variable or hex
function resolveColor(color: string): string {
  const colorMap: Record<string, string> = {
    '--success': '#10b981',
    '--error': '#ef4444',
    '--warning': '#f59e0b',
    '--primary': '#3686ff',
    '--text-secondary': '#9ca3af',
  };
  // If it's already a hex color or doesn't need mapping
  if (!color.startsWith('var(--')) {
    return color;
  }
  return colorMap[color] || color;
}

// Inline Badge component
function Badge({ label, color }: { label: string; color: string }) {
  const resolvedColor = resolveColor(color);
  return (
    <span
      className="font-bold rounded tracking-[0.08em] font-mono"
      style={{
        fontSize: 8,
        padding: '1px 5px',
        border: `1px solid ${resolvedColor}80`,
        background: `${resolvedColor}20`,
        color: resolvedColor,
      }}
    >
      {label}
    </span>
  );
}

interface CrackTabProps {
  jobs: CrackJob[];
  onNewJob: () => void;
}

export function CrackTab({ jobs, onNewJob }: CrackTabProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end gap-1.5">
        <Btn label="+ NEW JOB" color={$('--primary') || '#3686ff'} onClick={onNewJob} size="sm" />
        <Btn label="📂 SELECT WORDLIST" color={$('--text-secondary') || '#9ca3af'} size="sm" />
        <Btn label="⚙ HASHCAT GPU CONFIG" color={$('--text-secondary') || '#9ca3af'} size="sm" />
      </div>
      {jobs.map((job) => {
        const accentColor = CRACK_MODE_COLORS[job.mode];
        const ss = STATUS_STYLE[job.status];
        return (
          <div key={job.id} className="bg-card-background border border-border rounded-md p-3">
            <div className="flex items-center gap-2.5 mb-2">
              <Badge label={job.mode.toUpperCase()} color={accentColor} />
              <span className="text-xs font-bold text-text-primary">{job.targetSSID}</span>
              <span className="text-[9px] text-text-secondary">{job.targetBSSID}</span>
              <span className="ml-auto text-[9px] font-bold" style={{ color: ss.color }}>
                {ss.label}
              </span>
              <span className="text-[9px] text-text-secondary">{fmtTime(job.elapsedSeconds)}</span>
            </div>
            {job.status === 'running' && (
              <div className="flex items-center gap-2 mb-2">
                {progressBar(job.progress, accentColor, 4)}
                <span
                  className="text-[9px] font-bold w-[30px] text-right"
                  style={{ color: accentColor }}
                >
                  {job.progress}%
                </span>
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              {job.wordlist && (
                <div className="text-[9px]">
                  <span className="text-text-secondary">Wordlist: </span>
                  <span className="text-text-secondary">{job.wordlist}</span>
                </div>
              )}
              <div className="text-[9px]">
                <span className="text-text-secondary">Attempts: </span>
                <span className="text-text-primary">{fmtNum(job.attempts)}</span>
              </div>
              {job.speed > 0 && (
                <div className="text-[9px]">
                  <span className="text-text-secondary">Speed: </span>
                  <span className="text-success">{fmtNum(job.speed)} keys/s</span>
                </div>
              )}
              {job.eta && (
                <div className="text-[9px]">
                  <span className="text-text-secondary">ETA: </span>
                  <span className="text-warning">{job.eta}</span>
                </div>
              )}
              {job.hashFile && (
                <div className="text-[9px]">
                  <span className="text-text-secondary">File: </span>
                  <span className="text-text-secondary">{job.hashFile}</span>
                </div>
              )}
            </div>
            {job.result && (
              <div className="mt-2 text-[11px] text-success font-bold py-2 px-3 bg-success/10 border border-success/30 rounded">
                ✓ PASSWORD FOUND: {job.result}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
