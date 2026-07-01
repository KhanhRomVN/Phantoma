import React, { useState, useRef } from 'react';
import { AlienvaultScanParams, TooltipState } from '../types';
import { INDICATOR_TYPES } from '../constants';
import { CodeBlock } from '../../../../../../components/common/CodeBlock';
import { Play, Save } from 'lucide-react';
import { $ } from '@renderer/utils/color';

interface ExecutionTabProps {
  params: AlienvaultScanParams;
  setParams: React.Dispatch<React.SetStateAction<AlienvaultScanParams>>;
  scanning: boolean;
  progress: number;
  logOutput: string;
  onScan: () => void;
  onSaveProfile: () => void;
  accentColor: string;
  glow: string;
  indicatorHistory: string[];
  onTooltipShow: (tooltip: TooltipState | null) => void;
  savedProfiles?: Array<{ params: AlienvaultScanParams }>;
}

const ExecutionTab: React.FC<ExecutionTabProps> = ({
  params,
  setParams,
  scanning,
  progress,
  logOutput,
  onScan,
  onSaveProfile,
  accentColor,
  glow,
  indicatorHistory,
  onTooltipShow,
  savedProfiles = [],
}) => {
  const [showIndicatorSuggestions, setShowIndicatorSuggestions] = useState(false);
  const [showApiKeyInfo, setShowApiKeyInfo] = useState(false);
  const indicatorInputRef = useRef<HTMLInputElement>(null);

  const showTooltip = (text: string, e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onTooltipShow({ text, x: rect.left, y: rect.bottom + 6 });
  };

  const currentType = INDICATOR_TYPES.find((t) => t.value === params.indicatorType);

  return (
    <div className="flex flex-col gap-3.5">
      {/* ── Indicator Type Selector ── */}
      <div>
        <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
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
        <div className="flex gap-2">
          {INDICATOR_TYPES.map((type) => {
            const active = params.indicatorType === type.value;
            return (
              <button
                key={type.value}
                onClick={() =>
                  setParams({ ...params, indicatorType: type.value as any, indicator: '' })
                }
                onMouseEnter={(e) => showTooltip(type.note, e)}
                onMouseLeave={() => onTooltipShow(null)}
                className={`flex-1 py-2.5 rounded font-mono transition-all flex flex-col items-center gap-1 ${active ? 'bg-primary/10 text-primary border-primary' : 'bg-input-background text-text-secondary border-input-border-default'}`}
                style={{
                  border: `1px solid ${active ? `${accentColor}60` : ($('--input-border-default') || '')}`,
                  background: active ? `${accentColor}20` : undefined,
                }}
              >
                <span className="text-[11px] font-bold" style={{ color: active ? accentColor : undefined }}>
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Indicator Input ── */}
      <div className="relative">
        <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
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
          className="w-full box-border p-2.5 rounded text-[13px] font-inherit outline-none transition-colors bg-input-background text-text-primary placeholder:text-text-secondary"
          style={{
            border: `1px solid ${params.indicator ? `${accentColor}50` : ($('--input-border-default') || 'rgba(128,128,128,0.2)')}`,
            boxShadow: params.indicator ? `0 0 10px ${accentColor}20` : 'none',
          }}
        />
        {showIndicatorSuggestions && indicatorHistory.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-md z-10 max-h-[180px] overflow-y-auto border border-border bg-[#0a0f19]">
            {indicatorHistory.map((t, i) => (
              <div
                key={i}
                onClick={() => {
                  setParams({ ...params, indicator: t });
                  setShowIndicatorSuggestions(false);
                }}
                className="p-2 cursor-pointer text-[12px] transition-colors text-text-primary hover:bg-dropdown-item-hover"
                style={{ borderBottom: i < indicatorHistory.length - 1 ? '1px solid ' + ($('--border') || '') : 'none' }}
              >
                {t}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── API Key Input ── */}
      <div>
        <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
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
            className="ml-2 bg-transparent border-none cursor-pointer text-[10px] font-inherit"
            style={{ color: accentColor }}
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
          className="w-full box-border p-2.5 rounded text-[12px] font-mono font-inherit outline-none transition-colors bg-input-background text-text-primary placeholder:text-text-secondary"
          style={{ border: `1px solid ${params.apiKey ? `${accentColor}50` : ($('--input-border-default') || '')}` }}
        />
        {showApiKeyInfo && (
          <div className="mt-2 p-2 rounded text-[10px] bg-border text-text-secondary">
            🔐 Your API key is stored locally and never shared. Get yours at{' '}
            <a
              href="https://otx.alienvault.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: accentColor }}
            >
              otx.alienvault.com
            </a>{' '}
            → Profile → API Key
          </div>
        )}
      </div>

      {/* Footer with Save Profile and Execute buttons */}
      <div className="flex justify-between items-center gap-3 pt-4 mt-2 border-t border-border">
        <div className="flex-1" />
        <div className="flex gap-3">
          {(() => {
            const isProfileExists = savedProfiles.some(
              (profile) =>
                profile.params.indicatorType === params.indicatorType &&
                profile.params.apiKey === params.apiKey
            );
            const isSaveDisabled = scanning || !params.apiKey.trim() || isProfileExists;
            return (
              <button
                onClick={onSaveProfile}
                disabled={isSaveDisabled}
                className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold tracking-wide font-inherit transition-all bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                <Save size={14} />
                {isProfileExists ? 'PROFILE EXISTS' : 'SAVE PROFILE'}
              </button>
            );
          })()}
          <button
            onClick={onScan}
            disabled={scanning || !params.indicator.trim() || !params.apiKey.trim()}
            className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold tracking-wide font-inherit transition-all bg-primary text-text-foreground disabled:bg-input-background disabled:text-text-secondary disabled:cursor-not-allowed rounded"
            style={{
              border: `1px solid ${scanning || !params.indicator.trim() || !params.apiKey.trim() ? ($('--input-border-default') || '') : 'transparent'}`,
              boxShadow: scanning || !params.indicator.trim() || !params.apiKey.trim() ? 'none' : `0 0 18px ${accentColor}20`,
            }}
          >
            <Play size={14} />
            {scanning ? 'LOOKING UP...' : 'LOOKUP INDICATOR'}
          </button>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      {scanning && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] tracking-wide font-mono text-text-secondary">{params.indicator}</span>
            <span className="text-[10px] font-mono" style={{ color: accentColor }}>{progress}%</span>
          </div>
          <div className="h-px rounded-sm overflow-hidden bg-divider">
            <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accentColor}60, ${accentColor})`, boxShadow: `0 0 6px ${accentColor}` }} />
          </div>
        </div>
      )}

      {/* ── Lookup Log Output ────────────────────────────────────────── */}
      {(scanning || logOutput) && (
        <div>
          <label className="block text-xs font-bold tracking-wide mb-1.5 text-text-secondary">
            LOOKUP LOG OUTPUT
          </label>
          <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${accentColor}30`, minHeight: 250 }}>
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
