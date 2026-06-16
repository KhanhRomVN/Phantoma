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
    <div className="flex flex-col gap-2">
      {attacks.length === 0 && (
        <div className="text-center py-10 text-[10px] text-text-secondary">
          No active attacks. Select a network from the Scan tab.
        </div>
      )}
      {attacks.map((atk) => {
        const ss = STATUS_STYLE[atk.status];
        return (
          <div
            key={atk.id}
            className="bg-card-background border border-border rounded-md p-3"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: ss.dot, boxShadow: atk.status === 'running' ? `0 0 8px ${ss.dot}` : 'none' }}
              />
              <span className="text-xs font-bold text-text-primary">
                {ATK_LABEL[atk.type]}
              </span>
              <span className="text-[9px] text-text-secondary">→ {atk.targetSSID}</span>
              <span className="text-[8px] text-text-secondary">{atk.targetBSSID}</span>
              <span className="ml-auto text-[9px] font-bold" style={{ color: ss.color }}>
                {ss.label}
              </span>
              <span className="text-[9px] text-text-secondary">{fmtTime(atk.elapsedSeconds)}</span>
              {atk.status === 'running' && (
                <Btn label="■ STOP" color="var(--error)" onClick={() => onStop(atk.id)} size="xs" />
              )}
            </div>
            {atk.status === 'running' && (
              <div className="flex items-center gap-2 mb-2">
                {progressBar(atk.progress, ACCENT, 4)}
                <span
                  className="text-[9px] font-bold w-[30px] text-right"
                  style={{ color: ACCENT }}
                >
                  {atk.progress}%
                </span>
              </div>
            )}
            {atk.ivsCollected !== undefined && (
              <div className="text-[9px] text-warning mb-1.5">
                IVs collected: {fmtNum(atk.ivsCollected)}
              </div>
            )}
            {atk.result && (
              <div className="text-[10px] text-success font-bold py-1.5 px-2.5 bg-success/10 border border-success/30 rounded mb-2">
                ✓ {atk.result}
              </div>
            )}
            <div className="bg-input-background rounded p-1.5 font-mono text-[9px]">
              {atk.logLines.map((l, i) => (
                <div
                  key={i}
                  className="mb-0.5"
                  style={{ color: l.includes('✅') || l.includes('found') ? 'var(--green)' : 'var(--text-secondary)' }}
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