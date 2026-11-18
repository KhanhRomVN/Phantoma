import { CheckCheck, Hourglass, Lock } from 'lucide-react';
import type { Message } from '../../types';
import { fmtCd } from '../../utils';
import { Pill, Thin, Tip } from '../ui/Primitives';

interface MessageBubbleProps {
  m: Message;
}

export function MessageBubble({ m }: MessageBubbleProps) {
  const me = m.role === 'me';
  const countdown = m.countdown ?? 0;
  const burned = !!m.isBurnAfterReading && countdown <= 0;
  const danger = !!m.isBurnAfterReading && countdown > 0 && countdown <= 30;
  const look = burned
    ? 'bg-transparent border-dashed border-border'
    : me
      ? 'bg-primary/20 border-solid border-primary/40'
      : danger
        ? 'bg-card-background border-solid border-error/60'
        : 'bg-card-background border-solid border-border';
  return (
    <div className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`ch-msg max-w-[68%] rounded-xl px-3 py-2 border ${look}`}
        style={{
          borderTopRightRadius: me ? 4 : 12,
          borderTopLeftRadius: me ? 12 : 4,
        }}
      >
        {m.isBurnAfterReading && !burned && (
          <div className="flex items-center gap-1 mb-1">
            <Pill
              tone={danger ? 'error' : 'warn'}
              icon={Hourglass}
              className={danger ? 'ch-blink' : ''}
            >
              Self-destructs in {fmtCd(countdown)}
            </Pill>
          </div>
        )}
        <div
          className={`text-[13px] leading-[1.45] ${burned ? 'text-text-secondary italic' : 'text-text-primary not-italic'}`}
        >
          {burned ? 'This message self-destructed and was deleted from all devices.' : m.content}
        </div>
        {m.isBurnAfterReading && !burned && (
          <div className="mt-1.5">
            <Thin
              value={Math.min(100, (countdown / (m.total || countdown)) * 100)}
              tone={danger ? 'error' : 'warn'}
              h={2}
            />
          </div>
        )}
        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-text-secondary">
          {m.isEncrypted && (
            <Tip text="End-to-end encrypted (E2EE)" side="top">
              <Lock size={10} className="text-success" />
            </Tip>
          )}
          {m.time}
          {me && <CheckCheck size={11} className="text-info" />}
        </div>
      </div>
    </div>
  );
}