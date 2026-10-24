import React from 'react';
import { $ } from '@renderer/utils/color';

interface ListAgentsRendererProps {
  output: string;
  error?: string;
}

const ListAgentsRenderer: React.FC<ListAgentsRendererProps> = ({ output, error }) => {
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
            color: $('--text-primary'),
          }}
        >
          list_agents
        </span>
      </div>

      {error ? (
        <div
          style={{
            padding: '8px',
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
            padding: '8px',
            backgroundColor: $('--input-background'),
            borderRadius: '6px',
            fontSize: '12px',
            color: $('--text-secondary'),
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
          }}
        >
          {output}
        </div>
      )}
    </div>
  );
};

export default ListAgentsRenderer;