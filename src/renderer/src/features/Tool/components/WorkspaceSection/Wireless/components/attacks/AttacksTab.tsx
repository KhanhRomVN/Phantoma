// ============================================================================
// AttacksTab — Active attack monitoring
// ============================================================================

import type { ActiveAttack } from '../../types';
import { STATUS_STYLE, ATK_LABEL } from '../../constants';
import { progressBar, fmtTime, fmtNum } from '../../utils';
import { Btn } from '../shared/Btn';

interface AttacksTabProps {
  attacks: ActiveAttack[];
  onStop: (id: string) => void;
}

const ACCENT = 'var(--primary)';

export function AttacksTab({ attacks, onStop }: AttacksTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {attacks.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, fontSize: 10, color: 'var(--text-secondary)' }}>
          No active attacks. Select a network from the Scan tab.
        </div>
      )}
      {attacks.map((atk) => {
        const ss = STATUS_STYLE[atk.status];
        return (
          <div
            key={atk.id}
            style={{
              background: 'var(--card-background)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: ss.dot,
                  boxShadow: atk.status === 'running' ? `0 0 8px ${ss.dot}` : 'none',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                {ATK_LABEL[atk.type]}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>→ {atk.targetSSID}</span>
              <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>{atk.targetBSSID}</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: ss.color }}>
                {ss.label}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{fmtTime(atk.elapsedSeconds)}</span>
              {atk.status === 'running' && (
                <Btn label="■ STOP" color="var(--error)" onClick={() => onStop(atk.id)} size="xs" />
              )}
            </div>
            {atk.status === 'running' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {progressBar(atk.progress, ACCENT, 4)}
                <span
                  style={{
                    fontSize: 9,
                    color: ACCENT,
                    fontWeight: 700,
                    width: 30,
                    textAlign: 'right',
                  }}
                >
                  {atk.progress}%
                </span>
              </div>
            )}
            {atk.ivsCollected !== undefined && (
              <div style={{ fontSize: 9, color: 'var(--warning)', marginBottom: 6 }}>
                IVs collected: {fmtNum(atk.ivsCollected)}
              </div>
            )}
            {atk.result && (
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--success)',
                  fontWeight: 700,
                  padding: '6px 10px',
                  background: '#34d39910',
                  borderRadius: 4,
                  border: '1px solid #34d39930',
                  marginBottom: 8,
                }}
              >
                ✓ {atk.result}
              </div>
            )}
            <div
              style={{
                background: 'var(--input-background)',
                borderRadius: 4,
                padding: '6px 10px',
                fontFamily: 'inherit',
                fontSize: 9,
              }}
            >
              {atk.logLines.map((l, i) => (
                <div
                  key={i}
                  style={{
                    color: l.includes('✅') || l.includes('found') ? 'var(--success)' : 'var(--text-secondary)',
                    marginBottom: 2,
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}