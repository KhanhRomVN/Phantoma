import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: 'var(--input-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  color: 'var(--primary-text)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const {
    apiUrl,
    setApiUrl,
    isSimpleMode,
    setIsSimpleMode,
  } = useSettings();
  const [closeHover, setCloseHover] = useState(false);

  const toggleSimpleMode = () => {
    setIsSimpleMode(!isSimpleMode);
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 w-full h-full z-[9999] flex flex-col overflow-auto"
      style={{ backgroundColor: 'var(--secondary-bg)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-4 pt-4 pb-3.5 shrink-0"
        style={{
          borderTop: '1px solid var(--border-color)',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--tertiary-bg)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <div
            className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
            style={{
              background: 'rgba(128,128,128,0.1)',
              color: 'var(--vscode-foreground)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </div>
          <div>
            <span
              className="block font-bold text-sm tracking-[0.01em] mb-[3px]"
              style={{ color: 'var(--primary-text)' }}
            >
              Settings
            </span>
            <p
              className="m-0 text-xs opacity-70 leading-relaxed"
              style={{ color: 'var(--secondary-text)' }}
            >
              Configure your agent preferences
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          onMouseEnter={() => setCloseHover(true)}
          onMouseLeave={() => setCloseHover(false)}
          className="p-[5px] rounded-md shrink-0 self-center border-none flex items-center justify-center cursor-pointer transition-all duration-150"
          style={{
            backgroundColor: closeHover
              ? 'rgba(239,68,68,0.12)'
              : 'rgba(128,128,128,0.12)',
            color: closeHover
              ? 'var(--vscode-errorForeground, #f87171)'
              : 'var(--secondary-text)',
          }}
          title="Close Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto p-5 flex flex-col gap-6"
        style={{ backgroundColor: 'var(--secondary-bg)' }}
      >
        {/* API URL */}
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-semibold"
            style={{ color: 'var(--primary-text)' }}
          >
            Backend API URL
          </label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:8888"
            style={inputStyle}
          />
        </div>

        {/* Simple Mode Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div
              className="text-sm font-semibold mb-[3px]"
              style={{ color: 'var(--primary-text)' }}
            >
              Simple Mode
            </div>
            <div
              className="text-[11px] opacity-70"
              style={{ color: 'var(--secondary-text)' }}
            >
              Hide advanced options for a cleaner interface
            </div>
          </div>
          <button
            onClick={toggleSimpleMode}
            className="shrink-0 w-10 h-[22px] rounded-[11px] border-none cursor-pointer relative transition-colors duration-200"
            style={{
              backgroundColor: isSimpleMode
                ? 'var(--vscode-button-background, #0e639c)'
                : 'rgba(128,128,128,0.3)',
            }}
          >
            <span
              className="absolute top-[3px] w-4 h-4 rounded-full bg-white transition-[left] duration-200"
              style={{
                left: isSimpleMode ? '21px' : '3px',
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;