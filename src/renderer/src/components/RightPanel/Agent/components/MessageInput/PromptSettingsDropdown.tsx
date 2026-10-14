import React from 'react';
import { Settings, Zap, BookOpen, Database } from 'lucide-react';

interface PromptSettingsDropdownProps {
  systemPromptMode: string;
  onSelectSystemPromptMode: (mode: string) => void;
  isAntiInjection: boolean;
  
  diagnosticEnabled: boolean;
  onDiagnosticToggle?: () => void;
  
  skillEnabled: boolean;
  onSkillToggle?: () => void;
  
  memoryEnabled: boolean;
  onMemoryToggle?: () => void;
  
  toolFormat: 'xml' | 'json';
  onToolFormatToggle?: () => void;
}

const STYLE_MODES = [
  { key: 'concise', label: 'Concise', desc: 'Short, direct responses.' },
  { key: 'detailed', label: 'Detailed', desc: 'Comprehensive explanations.' },
  { key: 'expert', label: 'Expert', desc: 'Advanced technical depth.' },
  { key: 'none', label: 'None', desc: 'Disable custom system prompt styles.' },
];

const PromptSettingsDropdown: React.FC<PromptSettingsDropdownProps> = ({
  systemPromptMode,
  onSelectSystemPromptMode,
  isAntiInjection,
  diagnosticEnabled,
  onDiagnosticToggle,
  skillEnabled,
  onSkillToggle,
  memoryEnabled,
  onMemoryToggle,
  toolFormat,
  onToolFormatToggle,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '24px',
          width: '24px',
          boxSizing: 'border-box',
          borderRadius: '5px',
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out',
          border: '1px solid transparent',
          background: isOpen ? 'rgba(128, 128, 128, 0.16)' : 'transparent',
          color: 'var(--vscode-foreground)',
          padding: 0,
        }}
        title="Prompt Settings"
      >
        <Settings size={14} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            zIndex: 1000,
            backgroundColor: 'var(--vscode-dropdown-background, #252526)',
            border: '1px solid var(--vscode-widget-border, #454545)',
            borderRadius: '8px',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.35)',
            minWidth: '240px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Section: System Prompt Style */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--vscode-widget-border, #454545)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--vscode-descriptionForeground)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              System Prompt Style
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
              {STYLE_MODES.map((mode) => {
                const isActive = systemPromptMode === mode.key;
                const isDisabled = isAntiInjection && mode.key !== 'none';
                
                return (
                  <button
                    key={mode.key}
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) {
                        onSelectSystemPromptMode(mode.key);
                        // Optional: close dropdown after selection? Keeping open for multi-toggle convenience usually preferred in this design pattern, but let's keep it simple.
                        // setIsOpen(false); 
                      }
                    }}
                    style={{
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontWeight: isActive ? 600 : 400,
                      textAlign: 'left',
                      border: '1px solid transparent',
                      borderRadius: '4px',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      backgroundColor: isActive ? 'var(--vscode-button-background)' : 'transparent',
                      color: isActive ? 'var(--vscode-button-foreground)' : isDisabled ? 'var(--vscode-disabledForeground)' : 'var(--vscode-foreground)',
                      opacity: isDisabled ? 0.5 : 1,
                      transition: 'all 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !isDisabled) e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && !isDisabled) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
            {isAntiInjection && (
              <div style={{ marginTop: '6px', fontSize: '10px', color: '#f97316', fontStyle: 'italic' }}>
                ⚠️ Anti-injection enabled: Only "None" allowed.
              </div>
            )}
          </div>

          {/* Section: Feature Toggles */}
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
             <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--vscode-descriptionForeground)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Features
            </div>
            
            {/* Diagnostic Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={diagnosticEnabled}
                onChange={() => onDiagnosticToggle?.()}
                style={{ accentColor: 'var(--vscode-button-background)' }}
              />
              <Zap size={12} style={{ color: diagnosticEnabled ? '#a855f7' : 'inherit' }} />
              Diagnostics
            </label>

            {/* Skill Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={skillEnabled}
                onChange={() => onSkillToggle?.()}
                style={{ accentColor: 'var(--vscode-button-background)' }}
              />
              <BookOpen size={12} style={{ color: skillEnabled ? '#10b981' : 'inherit' }} />
              Skills
            </label>

            {/* Memory Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={() => onMemoryToggle?.()}
                style={{ accentColor: 'var(--vscode-button-background)' }}
              />
              <Database size={12} style={{ color: memoryEnabled ? '#3b82f6' : 'inherit' }} />
              Memory
            </label>
          </div>

          {/* Section: Tool Format */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--vscode-widget-border, #454545)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--vscode-descriptionForeground)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tool Format
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => toolFormat !== 'xml' && onToolFormatToggle?.()}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: toolFormat === 'xml' ? 600 : 400,
                  border: '1px solid transparent',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: toolFormat === 'xml' ? 'var(--vscode-button-background)' : 'transparent',
                  color: toolFormat === 'xml' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                }}
              >
                XML
              </button>
              <button
                onClick={() => toolFormat !== 'json' && onToolFormatToggle?.()}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: toolFormat === 'json' ? 600 : 400,
                  border: '1px solid transparent',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: toolFormat === 'json' ? 'var(--vscode-button-background)' : 'transparent',
                  color: toolFormat === 'json' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                }}
              >
                JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptSettingsDropdown;