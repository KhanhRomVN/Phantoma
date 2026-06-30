import React from 'react';
import { Bot, ShieldAlert } from 'lucide-react';

interface AgentOverlayProps {
  featureName?: string;
}

const AgentOverlay: React.FC<AgentOverlayProps> = ({ featureName }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--secondary-bg, rgba(0,0,0,0.85))',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        gap: '16px',
        padding: '32px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'color-mix(in srgb, var(--vscode-errorForeground, #f87171) 15%, transparent)',
          border: '2px solid color-mix(in srgb, var(--vscode-errorForeground, #f87171) 30%, transparent)',
        }}
      >
        <ShieldAlert
          style={{
            width: '32px',
            height: '32px',
            color: 'var(--vscode-errorForeground, #f87171)',
            opacity: 0.8,
          }}
        />
      </div>

      <div
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--vscode-foreground, #e5e7eb)',
            margin: 0,
          }}
        >
          Agent Not Available
        </h3>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--vscode-descriptionForeground, #9ca3af)',
            margin: 0,
            lineHeight: 1.6,
            maxWidth: '320px',
          }}
        >
          {featureName
            ? `Module "${featureName}" does not support the Agent feature.`
            : 'This module does not support the Agent feature.'}
        </p>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--vscode-descriptionForeground, #6b7280)',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: '320px',
          }}
        >
          Switch to <strong>Emulate</strong> to enable AI-powered HTTP traffic
          analysis with the Agent.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '6px',
          backgroundColor: 'color-mix(in srgb, var(--vscode-button-background, #3b82f6) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--vscode-button-background, #3b82f6) 20%, transparent)',
          marginTop: '8px',
        }}
      >
        <Bot style={{ width: '14px', height: '14px', color: 'var(--vscode-button-background, #3b82f6)' }} />
        <span
          style={{
            fontSize: '11px',
            color: 'var(--vscode-button-background, #3b82f6)',
            fontWeight: 500,
          }}
        >
          Available in: Emulate
        </span>
      </div>
    </div>
  );
};

export default AgentOverlay;