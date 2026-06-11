import React, { useState, useRef } from 'react';
import { AlienvaultScanParams, TooltipState } from '../types';
import { INDICATOR_TYPES } from '../constants';
import { CodeBlock } from '../../../../../../../../../core/components/CodeBlock';

interface ExecutionTabProps {
  params: AlienvaultScanParams;
  setParams: React.Dispatch<React.SetStateAction<AlienvaultScanParams>>;
  scanning: boolean;
  progress: number;
  logOutput: string;
  onScan: () => void;
  accentColor: string;
  glow: string;
  indicatorHistory: string[];
  onTooltipShow: (tooltip: TooltipState | null) => void;
}

const ExecutionTab: React.FC<ExecutionTabProps> = ({
  params,
  setParams,
  scanning,
  progress,
  logOutput,
  onScan,
  accentColor,
  glow,
  indicatorHistory,
  onTooltipShow,
}) => {
  const [showIndicatorSuggestions, setShowIndicatorSuggestions] = useState(false);
  const [showApiKeyInfo, setShowApiKeyInfo] = useState(false);
  const indicatorInputRef = useRef<HTMLInputElement>(null);

  const showTooltip = (text: string, e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onTooltipShow({ text, x: rect.left, y: rect.bottom + 6 });
  };

  const inputBase: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 13px',
    background: 'var(--input-background)',
    border: '1px solid var(--input-border-default)',
    borderRadius: 4,
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  const currentType = INDICATOR_TYPES.find(t => t.value === params.indicatorType);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── API Key Info Banner ── */}
      <div
        style={{
          padding: '10px 12px',
          background: `${accentColor}10`,
          border: `1px solid ${accentColor}30`,
          borderRadius: 4,
          fontSize: 11,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>🔑 AlienVault OTX API key required. Get one free at </span>
        <a
          href="https://otx.alienvault.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: accentColor }}
        >
          otx.alienvault.com
        </a>
      </div>

      {/* ── Indicator Type Selector ── */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            letterSpacing: '0.12em',
            marginBottom: 6,
            cursor: 'default',
          }}
        >
          <span
            onMouseEnter={(e) =>
              showTooltip(
                'Select the type of indicator you want to lookup: IP address, domain name, file hash, or URL',
                e,
              )
            }
            onMouseLeave={() => onTooltipShow(null)}
          >
            INDICATOR TYPE
          </span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {INDICATOR_TYPES.map((type) => {
            const active = params.indicatorType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => setParams({ ...params, indicatorType: type.value as any, indicator: '' })}
                onMouseEnter={(e) => showTooltip(type.note, e)}
                onMouseLeave={() => onTooltipShow(null)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 4,
                  border: `1px solid ${active ? `${accentColor}60` : 'var(--input-border-default)'}`,
                  background: active ? `${accentColor}20` : 'var(--input-background)',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  transition: 'all 0.12s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: active ? accentColor : 'var(--text-secondary)' }}>
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Indicator Input ── */}
      <div style={{ position: 'relative' }}>
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            letterSpacing: '0.12em',
            marginBottom: 6,
            cursor: 'default',
          }}
        >
          <span
            onMouseEnter={(e) =>
              showTooltip(
                `Enter a ${currentType?.label.toLowerCase()} to lookup threat intelligence data from AlienVault OTX`,
                e,
              )
            }
            onMouseLeave={() => onTooltipShow(null)}
          >
            INDICATOR VALUE
          </span>
        </label>
        <input
          ref={indicatorInputRef}
          type="text"
          value={params.indicator}
          onChange={(e) => setParams({ ...params, indicator: e.target.value })}
          onFocus={() => setShowIndicatorSuggestions(true)}
          onBlur={() => setTimeout(() => setShowIndicatorSuggestions(false), 150)}
          onKeyDown={(e) => e.key === 'Enter' && onScan()}
          placeholder={currentType?.placeholder}
          style={{
            ...inputBase,
            border: `1px solid ${params.indicator ? `${accentColor}50` : 'var(--input-border-default)'}`,
            boxShadow: params.indicator ? `0 0 10px ${accentColor}20` : 'none',
            fontSize: 13,
            padding: '11px 14px',
          }}
        />
        {showIndicatorSuggestions && indicatorHistory.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 3,
              background: 'var(--dropdown-background)',
              border: `1px solid ${accentColor}30`,
              borderRadius: 4,
              zIndex: 10,
              maxHeight: 180,
              overflowY: 'auto',
            }}
          >
            {indicatorHistory.map((t, i) => (
              <div
                key={i}
                onClick={() => {
                  setParams({ ...params, indicator: t });
                  setShowIndicatorSuggestions(false);
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  borderBottom: i < indicatorHistory.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dropdown-item-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {t}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── API Key Input ── */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            letterSpacing: '0.12em',
            marginBottom: 6,
            cursor: 'default',
          }}
        >
          <span
            onMouseEnter={(e) =>
              showTooltip(
                'Your AlienVault OTX API key. Get it from https://otx.alienvault.com/ after signing up',
                e,
              )
            }
            onMouseLeave={() => onTooltipShow(null)}
          >
            API KEY
          </span>
          <button
            onClick={() => setShowApiKeyInfo(!showApiKeyInfo)}
            style={{
              marginLeft: 8,
              background: 'transparent',
              border: 'none',
              color: accentColor,
              cursor: 'pointer',
              fontSize: 10,
              fontFamily: 'inherit',
            }}
          >
            [?]
          </button>
        </label>
        <input
          type="password"
          value={params.apiKey}
          onChange={(e) => setParams({ ...params, apiKey: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && onScan()}
          placeholder="Enter your OTX API key..."
          style={{
            ...inputBase,
            border: `1px solid ${params.apiKey ? `${accentColor}50` : 'var(--input-border-default)'}`,
            fontFamily: 'monospace',
          }}
        />
        {showApiKeyInfo && (
          <div
            style={{
              marginTop: 8,
              padding: '8px 12px',
              background: 'var(--border)',
              borderRadius: 4,
              fontSize: 10,
              color: 'var(--text-secondary)',
            }}
          >
            🔐 Your API key is stored locally and never shared. Get yours at{' '}
            <a href="https://otx.alienvault.com/" target="_blank" rel="noopener noreferrer" style={{ color: accentColor }}>
              otx.alienvault.com
            </a>{' '}
            → Profile → API Key
          </div>
        )}
      </div>

      {/* ── Execute Button ── */}
      <button
        onClick={onScan}
        disabled={scanning || !params.indicator.trim() || !params.apiKey.trim()}
        style={{
          width: '100%',
          padding: '12px',
background:
            scanning || !params.indicator.trim() || !params.apiKey.trim()
              ? 'var(--input-background)'
              : `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`,
          border: `1px solid ${scanning || !params.indicator.trim() || !params.apiKey.trim() ? 'var(--input-border-default)' : `${accentColor}70`}`,
          color: scanning || !params.indicator.trim() || !params.apiKey.trim() ? 'var(--text-secondary)' : accentColor,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.15em',
          cursor: scanning || !params.indicator.trim() || !params.apiKey.trim() ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          boxShadow: scanning || !params.indicator.trim() || !params.apiKey.trim() ? 'none' : `0 0 18px ${accentColor}20`,
          transition: 'all 0.2s',
          marginTop: 3,
        }}
      >
        {scanning ? '▸ LOOKING UP...' : '▸ LOOKUP INDICATOR'}
      </button>

      {/* ── Progress Bar ── */}
      {scanning && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-secondary)',
                letterSpacing: '0.1em',
                fontFamily: 'monospace',
              }}
            >
              {params.indicator}
            </span>
            <span style={{ fontSize: 10, color: accentColor, fontFamily: 'monospace' }}>
              {progress}%
            </span>
          </div>
          <div style={{ height: 1, background: 'var(--divider)', borderRadius: 1, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${accentColor}60, ${accentColor})`,
                boxShadow: `0 0 6px ${accentColor}`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Lookup Log Output ────────────────────────────────────────── */}
      {(scanning || logOutput) && (
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.12em',
              marginBottom: 6,
            }}
          >
            LOOKUP LOG OUTPUT
          </label>
          <div
            style={{
              borderRadius: 5,
              border: `1px solid ${accentColor}30`,
              overflow: 'hidden',
              minHeight: 250,
            }}
          >
            <CodeBlock
              code={logOutput || 'Waiting for lookup to start...'}
              language="plaintext"
              showLineNumbers={true}
              editorOptions={{ readOnly: true }}
              className="h-[300px]"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionTab;