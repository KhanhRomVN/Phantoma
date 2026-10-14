import React from 'react';
import { Terminal } from 'lucide-react';

interface ZenCliHintBarProps {
  isClaudeProvider: boolean;
}

/**
 * Small hint bar below the input box in Home Panel.
 * Provides quick tips for CLI usage or specific provider behaviors.
 */
export const ZenCliHintBar: React.FC<ZenCliHintBarProps> = ({ isClaudeProvider }) => {
  // Only show hints relevant to current context if needed. 
  // For now, we keep it simple as per original Zen implementation which often had static hints.
  
  const hints = [
    { icon: '/', text: 'Use /commands for shortcuts' },
    { icon: '@', text: 'Mention files with @filename' },
  ];

  if (isClaudeProvider) {
    hints.push({ icon: '📦', text: 'Workspace will be zipped on first message' });
  }

  return (
    <div
      style={{
        marginTop: '4px',
        paddingLeft: '8px',
        paddingRight: '8px',
        display: 'flex',
        gap: '12px',
        fontSize: '10px',
        color: 'var(--vscode-descriptionForeground)',
        opacity: 0.7,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {hints.map((hint, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Terminal size={9} />
          <span>{hint.text}</span>
        </div>
      ))}
    </div>
  );
};