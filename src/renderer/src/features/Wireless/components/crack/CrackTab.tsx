// ============================================================================
// CrackTab — Password cracking job tracking
// ============================================================================

import type { CrackJob } from '../../types';
import { STATUS_STYLE, CRACK_MODE_COLORS } from '../../constants';
import { progressBar, fmtTime, fmtNum } from '../../utils';
import { Btn } from '../shared/Btn';
import { Tag } from '../shared/Tag';

interface CrackTabProps {
  jobs: CrackJob[];
  onNewJob: () => void;
}

export function CrackTab({ jobs, onNewJob }: CrackTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <Btn label="+ NEW JOB" color="var(--primary)" onClick={onNewJob} size="sm" />
        <Btn label="📂 SELECT WORDLIST" color="var(--text-secondary)" size="sm" />
        <Btn label="⚙ HASHCAT GPU CONFIG" color="var(--text-secondary)" size="sm" />
      </div>
      {jobs.map((job) => {
        const accentColor = CRACK_MODE_COLORS[job.mode];
        const ss = STATUS_STYLE[job.status];
        return (
          <div
            key={job.id}
            style={{
              background: 'var(--card-background)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Tag label={job.mode.toUpperCase()} color={accentColor} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                {job.targetSSID}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{job.targetBSSID}</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: ss.color }}>
                {ss.label}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{fmtTime(job.elapsedSeconds)}</span>
            </div>
            {job.status === 'running' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {progressBar(job.progress, accentColor, 4)}
                <span
                  style={{
                    fontSize: 9,
                    color: accentColor,
                    fontWeight: 700,
                    width: 30,
                    textAlign: 'right',
                  }}
                >
                  {job.progress}%
                </span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {job.wordlist && (
                <div style={{ fontSize: 9 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Wordlist: </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{job.wordlist}</span>
                </div>
              )}
              <div style={{ fontSize: 9 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Attempts: </span>
                <span style={{ color: 'var(--text-primary)' }}>{fmtNum(job.attempts)}</span>
              </div>
              {job.speed > 0 && (
                <div style={{ fontSize: 9 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Speed: </span>
                  <span style={{ color: 'var(--success)' }}>{fmtNum(job.speed)} keys/s</span>
                </div>
              )}
              {job.eta && (
                <div style={{ fontSize: 9 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>ETA: </span>
                  <span style={{ color: 'var(--warning)' }}>{job.eta}</span>
                </div>
              )}
              {job.hashFile && (
                <div style={{ fontSize: 9 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>File: </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{job.hashFile}</span>
                </div>
              )}
            </div>
            {job.result && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: 'var(--success)',
                  fontWeight: 700,
                  padding: '8px 12px',
                  background: '#34d39910',
                  border: '1px solid #34d39930',
                  borderRadius: 4,
                }}
              >
                ✓ PASSWORD FOUND: {job.result}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}