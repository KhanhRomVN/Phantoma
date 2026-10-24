import React from 'react';
import { $ } from '@renderer/utils/color';

interface SendMessageRendererProps {
  agentId: string;
  message: string;
  output: string;
  error?: string;
}

const SendMessageRenderer: React.FC<SendMessageRendererProps> = ({
  agentId,
  message,
  output,
  error,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        backgroundColor: $('--card-background'),
        borderRadius: '8px',
        border: `1px solid ${$('--border')}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: $('--primary'),
          }}
        >
          send_message
        </span>
        <span
          style={{
            fontSize: '11px',
            color: $('--text-secondary'),
            opacity: 0.7,
          }}
        >
          → {agentId}
        </span>
      </div>

      <div
        style={{
          padding: '8px 12px',
          backgroundColor: $('--input-background'),
          borderRadius: '6px',
          fontSize: '12px',
          color: $('--text-secondary'),
          whiteSpace: 'pre-wrap',
          maxHeight: '200px',
          overflow: 'auto',
          lineHeight: 1.5,
        }}
      >
        {message}
      </div>

      {error ? (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: `color-mix(in srgb, ${$('--error')} 10%, transparent)`,
            borderRadius: '6px',
            fontSize: '12px',
            color: $('--error'),
          }}
        >
          {error}
        </div>
      ) : (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: `color-mix(in srgb, ${$('--success')} 10%, transparent)`,
            borderRadius: '6px',
            fontSize: '12px',
            color: $('--success'),
          }}
        >
          {output}
        </div>
      )}
    </div>
  );
};

export default SendMessageRenderer;