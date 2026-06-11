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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <Btn label="⬇ EXPORT LOG" color="var(--primary)" size="sm" />
        <Btn label="🗑 CLEAR" color="var(--error)" size="sm" />
      </div>
      <div
        ref={ref}
        style={{
          background: 'var(--input-background)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '10px 12px',
          height: 520,
          overflowY: 'auto',
          fontFamily: 'inherit',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>[INFO] Awaiting commands...</div>
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
              ? 'var(--success)'
              : isError
                ? 'var(--error)'
                : isWarn
                  ? 'var(--warning)'
                  : 'var(--text-secondary)';
            return (
              <div
                key={i}
                style={{ fontSize: 9, color, marginBottom: 2, letterSpacing: '0.02em' }}
              >
                {msg}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}