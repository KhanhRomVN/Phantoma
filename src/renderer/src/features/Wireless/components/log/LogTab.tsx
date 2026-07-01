// ============================================================================
// LogTab — Live log viewer with auto-scroll
// ============================================================================

import { useRef, useEffect } from 'react';
import { Btn } from '../shared/Btn';

interface LogTabProps {
  messages: string[];
}

export function LogTab({ messages }: LogTabProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 justify-end">
        <Btn label="⬇ EXPORT LOG" color={$('--primary') || '#3686ff'} size="sm" />
        <Btn label="🗑 CLEAR" color={$('--error') || '#ef4444'} size="sm" />
      </div>
      <div
        ref={ref}
        className="bg-input-background border border-border rounded-md py-2.5 px-3 h-[520px] overflow-y-auto font-mono"
      >
        {messages.length === 0 ? (
          <div className="text-[9px] text-text-secondary">[INFO] Awaiting commands...</div>
        ) : (
          messages.map((msg, i) => {
            const isSuccess =
              msg.includes('✅') ||
              msg.includes('✓') ||
              msg.toLowerCase().includes('found') ||
              msg.toLowerCase().includes('captured');
            const isError =
              msg.toLowerCase().includes('error') ||
              msg.toLowerCase().includes('failed') ||
              msg.includes('✗');
            const isWarn = msg.includes('⚠') || msg.toLowerCase().includes('warn');
            const color = isSuccess
              ? $('--green')
              : isError
                ? $('--error')
                : isWarn
                  ? ($('--yellow') || '#eab308')
                  : $('--text-secondary');
            return (
              <div key={i} className="text-[9px] mb-0.5 tracking-[0.02em]" style={{ color }}>
                {msg}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
