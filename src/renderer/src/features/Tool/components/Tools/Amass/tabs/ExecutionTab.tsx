import React, { useState, useRef } from 'react';
import { AmassScanParams, TooltipState } from '../types';
import { buildCommand } from '../utils';
import { MODES, OUTPUT_FORMATS, COMMON_FLAGS, DATA_SOURCES } from '../constants';
import { CodeBlock } from '../../../../../../components/common/CodeBlock';
import { Play, Save } from 'lucide-react';

interface FlagCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  flags: Array<{ label: string; value: string; desc: string }>;
}

interface FlagAccordionProps {
  category: FlagCategory;
  activeFlags: string;
  onToggle: (flagValue: string) => void;
  accentColor: string;
  glow: string;
  onTooltipShow: (tooltip: TooltipState | null) => void;
}

const FlagAccordion: React.FC<FlagAccordionProps> = ({
  category,
  activeFlags,
  onToggle,
  accentColor,
  glow,
  onTooltipShow,
}) => {
  const activeCount = category.flags.filter((f) => activeFlags.includes(f.value)).length;

  const showTooltip = (text: string, e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onTooltipShow({ text, x: rect.left, y: rect.bottom + 6 });
  };

  return (
    <div>
      <div className="flex items-center gap-2.5 py-2">
        <span className="flex-1 text-xs font-bold tracking-wide text-text-primary">
          <span
            onMouseEnter={(e) => {
              const flagList = category.flags.map((f) => f.value).join(', ');
              showTooltip(`${category.label}: ${flagList}`, e);
            }}
            onMouseLeave={() => onTooltipShow(null)}
          >
            {category.label}
          </span>
        </span>
        {activeCount > 0 && (
          <span
            className="text-[9px] font-bold rounded-full px-2 py-0.5"
            style={{
              color: accentColor,
              background: accentColor + '20',
              border: `1px solid ${accentColor}40`,
            }}
          >
            {activeCount}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 pb-3">
        {category.flags.map((flag) => {
          const active = activeFlags.includes(flag.value);
          return (
            <button
              key={flag.value}
              onClick={() => onToggle(flag.value)}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = accentColor + '50';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = accentColor + '08';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = 'var(--input-border-default)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
              className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded text-xs font-semibold font-mono whitespace-nowrap transition-all duration-100"
              style={{
                border: `1px solid ${active ? accentColor + '60' : 'var(--input-border-default)'}`,
                background: active ? 'var(--primary-10)' : 'transparent',
                color: active ? accentColor : 'var(--text-secondary)',
              }}
            >
              <span>{flag.label}</span>
              <span className="text-[9px] opacity-70 font-normal whitespace-nowrap text-text-secondary">
                {flag.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface ExecutionTabProps {
  params: AmassScanParams;
  setParams: React.Dispatch<React.SetStateAction<AmassScanParams>>;
  scanning: boolean;
  progress: number;
  logOutput: string;
  onScan: () => void;
  onSaveProfile: () => void;
  accentColor: string;
  glow: string;
  targetHistory: string[];
  onTooltipShow: (tooltip: TooltipState | null) => void;
  savedProfiles?: Array<{ params: AmassScanParams }>;
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
  targetHistory,
  onTooltipShow,
  savedProfiles = [],
}) => {
  const [showTargetSuggestions, setShowTargetSuggestions] = useState(false);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [showFlagSuggestions, setShowFlagSuggestions] = useState(false);
  const [sourceInputValue, setSourceInputValue] = useState('');
  const targetInputRef = useRef<HTMLInputElement>(null);

  const toggleFlag = (flagValue: string) => {
    const flags = params.additionalFlags.split(' ').filter(Boolean);
    if (flags.includes(flagValue)) {
      setParams({ ...params, additionalFlags: flags.filter((f) => f !== flagValue).join(' ') });
    } else {
      setParams({ ...params, additionalFlags: [...flags, flagValue].join(' ') });
    }
  };

  const showTooltip = (text: string, e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onTooltipShow({ text, x: rect.left, y: rect.bottom + 6 });
  };

  // Filtered sources for autocomplete
  const filteredSources = DATA_SOURCES.filter(
    (s) =>
      params.includeSources.toLowerCase().includes(s.toLowerCase()) ||
      s.toLowerCase().includes(params.includeSources.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3.5">
      {/* Command Preview */}
      <div>
        <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
          COMMAND PREVIEW
        </label>
        <div className="p-2.5 rounded-md flex items-center gap-2 bg-input-background border border-border">
          <span className="text-[12px] font-mono shrink-0 text-text-secondary">$</span>
          <span className="text-[12px] font-mono flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-text-secondary">
            {buildCommand(params)}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(buildCommand(params))}
            onMouseEnter={(e) => {
              showTooltip('Copy command to clipboard', e);
              (e.currentTarget as HTMLButtonElement).style.color = accentColor;
            }}
            onMouseLeave={(e) => {
              onTooltipShow(null);
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
            }}
            className="bg-transparent border-none cursor-pointer p-1 transition-colors shrink-0 text-text-secondary"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Target */}
      <div className="relative">
        <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
          <span
            onMouseEnter={(e) =>
              showTooltip('Domain target để enumerate subdomain. Ví dụ: example.com', e)
            }
            onMouseLeave={() => onTooltipShow(null)}
          >
            TARGET DOMAIN
          </span>
        </label>
        <input
          ref={targetInputRef}
          type="text"
          value={params.target}
          onChange={(e) => setParams({ ...params, target: e.target.value })}
          onFocus={() => setShowTargetSuggestions(true)}
          onBlur={() => setTimeout(() => setShowTargetSuggestions(false), 150)}
          onKeyDown={(e) => e.key === 'Enter' && onScan()}
          placeholder="example.com  ·  sub.example.com  ·  example.org"
          className="w-full box-border p-2.5 rounded text-[13px] font-inherit outline-none transition-colors bg-input-background text-text-primary placeholder:text-text-secondary"
          style={{
            border: `1px solid ${params.target ? accentColor + '50' : 'var(--input-border-default)'}`,
            boxShadow: params.target ? `0 0 10px ${glow}` : 'none',
          }}
        />
        {showTargetSuggestions && targetHistory.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded z-10 max-h-[180px] overflow-y-auto"
            style={{
              background: 'rgb(10, 15, 25)',
              border: `1px solid ${accentColor}30`,
            }}
          >
            {targetHistory.map((t, i) => (
              <div
                key={i}
                onClick={() => {
                  setParams({ ...params, target: t });
                  setShowTargetSuggestions(false);
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  borderBottom: i < targetHistory.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--dropdown-item-hover)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {t}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mode + DNS QPS + Timeout Row */}
      <div className="grid grid-cols-3 gap-3 items-end">
        {/* MODE */}
        <div>
          <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
            <span
              onMouseEnter={(e) =>
                showTooltip(
                  'Enumeration: tìm subdomain từ các nguồn dữ liệu. Intelligence: thu thập thông tin ASN/whois.',
                  e,
                )
              }
              onMouseLeave={() => onTooltipShow(null)}
            >
              MODE
            </span>
          </label>
          <div className="flex gap-2">
            {MODES.map((mode) => {
              const active = params.mode === mode.value;
              return (
                <button
                  key={mode.value}
                  onClick={() => setParams({ ...params, mode: mode.value as any })}
                  className={`flex-1 py-2.5 px-2 rounded font-mono transition-all text-center ${active ? 'bg-primary/10 text-primary border-primary' : 'bg-input-background text-text-secondary border-input-border-default'}`}
                  style={{
                    border: `1px solid ${active ? accentColor + '60' : 'var(--input-border-default)'}`,
                    background: active ? glow : undefined,
                  }}
                >
                  <span
                    className="text-[13px] font-bold block"
                    style={{ color: active ? accentColor : undefined }}
                  >
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {/* DNS QPS */}
        <div>
          <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
            <span
              onMouseEnter={(e) =>
                showTooltip(
                  'DNS queries per second — giới hạn tốc độ truy vấn DNS để tránh bị chặn (rate limiting).',
                  e,
                )
              }
              onMouseLeave={() => onTooltipShow(null)}
            >
              DNS QPS
            </span>
          </label>
          <input
            type="number"
            value={params.dnsQps}
            onChange={(e) => setParams({ ...params, dnsQps: parseInt(e.target.value) || 10 })}
            min={1}
            max={100}
            className="w-full box-border p-2.5 rounded text-[12px] font-inherit outline-none transition-colors bg-input-background border border-input-border-default text-text-primary"
          />
        </div>
        {/* TIMEOUT */}
        <div>
          <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
            <span
              onMouseEnter={(e) =>
                showTooltip(
                  'Thời gian chờ tối đa (giây) cho mỗi tác vụ enumeration trước khi timeout.',
                  e,
                )
              }
              onMouseLeave={() => onTooltipShow(null)}
            >
              TIMEOUT (s)
            </span>
          </label>
          <input
            type="number"
            value={params.timeout}
            onChange={(e) => setParams({ ...params, timeout: parseInt(e.target.value) || 60 })}
            min={10}
            max={600}
            className="w-full box-border p-2.5 rounded text-[12px] font-inherit outline-none transition-colors bg-input-background border border-input-border-default text-text-primary"
          />
        </div>
      </div>

{/* Row: Enumeration Type + Output Format */}
      <div className="grid grid-cols-2 gap-3">
        {/* Enumeration Type - Passive/Active/Brute */}
        <div>
          <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
            <span onMouseEnter={(e) => showTooltip('Passive: không gửi request trực tiếp. Active: DNS resolution & zone transfer. Brute Force: thử hàng loạt subdomain phổ biến.', e)} onMouseLeave={() => onTooltipShow(null)}>
              ENUMERATION TYPE
            </span>
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setParams({ ...params, passiveOnly: true, activeEnabled: false })}
              className={`flex-1 py-2 px-3 rounded text-[11px] font-semibold font-inherit transition-all ${params.passiveOnly && !params.activeEnabled ? 'bg-primary/10 text-primary border-primary' : 'bg-input-background text-text-secondary border-input-border-default'}`}
              style={{
                border: `1px solid ${params.passiveOnly && !params.activeEnabled ? accentColor + '60' : 'var(--input-border-default)'}`,
                background: params.passiveOnly && !params.activeEnabled ? glow : undefined,
                color: params.passiveOnly && !params.activeEnabled ? accentColor : undefined,
              }}
            >
              Passive Only
            </button>
            <button
              onClick={() => setParams({ ...params, passiveOnly: false, activeEnabled: true })}
              className={`flex-1 py-2 px-3 rounded text-[11px] font-semibold font-inherit transition-all ${params.activeEnabled && !params.passiveOnly ? 'bg-primary/10 text-primary border-primary' : 'bg-input-background text-text-secondary border-input-border-default'}`}
              style={{
                border: `1px solid ${params.activeEnabled && !params.passiveOnly ? accentColor + '60' : 'var(--input-border-default)'}`,
                background: params.activeEnabled && !params.passiveOnly ? glow : undefined,
                color: params.activeEnabled && !params.passiveOnly ? accentColor : undefined,
              }}
            >
              Active + Passive
            </button>
            <button
              onClick={() => setParams({ ...params, bruteForce: !params.bruteForce })}
              className={`flex-1 py-2 px-3 rounded text-[11px] font-semibold font-inherit transition-all ${params.bruteForce ? 'bg-primary/10 text-primary border-primary' : 'bg-input-background text-text-secondary border-input-border-default'}`}
              style={{
                border: `1px solid ${params.bruteForce ? accentColor + '60' : 'var(--input-border-default)'}`,
                background: params.bruteForce ? glow : undefined,
                color: params.bruteForce ? accentColor : undefined,
              }}
            >
              Brute Force
            </button>
          </div>
        </div>

        {/* Output Format */}
        <div>
          <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
            OUTPUT FORMAT
          </label>
          <div className="flex gap-2">
            {OUTPUT_FORMATS.map((fmt) => (
              <button key={fmt.value} onClick={() => setParams({ ...params, outputFormat: fmt.value as any })} className={`flex-1 py-2 px-3 rounded text-[11px] font-semibold font-inherit transition-all ${params.outputFormat === fmt.value ? 'bg-primary/10 text-primary border-primary' : 'bg-input-background text-text-secondary border-input-border-default'}`} style={{ border: `1px solid ${params.outputFormat === fmt.value ? accentColor + '60' : 'var(--input-border-default)'}`, background: params.outputFormat === fmt.value ? glow : undefined }}>
                {fmt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
{/* Row: Data Sources + Additional Flags */}
      <div className="grid grid-cols-2 gap-3">
        {/* Data Sources Section with Multi-Choice Badges */}
        <div>
          <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
            <span onMouseEnter={(e) => showTooltip('Chọn nguồn dữ liệu để thu thập', e)} onMouseLeave={() => onTooltipShow(null)}>
              DATA SOURCES
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={sourceInputValue}
              onChange={(e) => setSourceInputValue(e.target.value)}
              onFocus={() => setShowSourceSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSourceSuggestions(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sourceInputValue.trim()) {
                  const currentSources = params.includeSources.split(',').filter(s => s.trim());
                  if (!currentSources.includes(sourceInputValue.trim())) {
                    const newSources = [...currentSources, sourceInputValue.trim()].join(',');
                    setParams({ ...params, includeSources: newSources });
                  }
                  setSourceInputValue('');
                  setShowSourceSuggestions(false);
                }
              }}
              placeholder="Nhập tên nguồn và nhấn Enter..."
              className="w-full box-border p-2.5 rounded text-[12px] font-inherit outline-none transition-colors bg-input-background border border-input-border-default text-text-primary placeholder:text-text-secondary"
            />
            {showSourceSuggestions && filteredSources.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-md z-10 max-h-[150px] overflow-y-auto border border-border bg-[#0a0f19]">
                {filteredSources.filter(src => !params.includeSources.split(',').map(s => s.trim()).includes(src)).slice(0, 10).map((src, i) => (
                  <div key={i} onClick={() => {
                    const currentSources = params.includeSources.split(',').filter(s => s.trim());
                    if (!currentSources.includes(src)) {
                      const newSources = [...currentSources, src].join(',');
                      setParams({ ...params, includeSources: newSources });
                    }
                    setShowSourceSuggestions(false);
                    setSourceInputValue('');
                  }} className="p-1.5 cursor-pointer text-[11px] transition-colors text-text-primary hover:bg-dropdown-item-hover" style={{ borderBottom: i < 9 ? '1px solid var(--border)' : 'none' }}>
                    {src}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {params.includeSources.split(',').filter(s => s.trim()).map((src, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/30"
              >
                {src.trim()}
                <button
                  onClick={() => {
                    const newSources = params.includeSources.split(',').filter(s => s.trim() !== src.trim()).join(',');
                    setParams({ ...params, includeSources: newSources });
                  }}
                  className="ml-1 hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="text-[9px] text-text-secondary mt-1">
            Available: crtsh, alienvault, wayback, shodan, censys, virustotal, dnsdb, ...
          </div>
        </div>

        {/* Additional Flags with Input + Combobox */}
        <div>
          <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
            <span onMouseEnter={(e) => showTooltip('Các flag bổ sung cho Amass (cách nhau bằng dấu cách)', e)} onMouseLeave={() => onTooltipShow(null)}>
              ADDITIONAL FLAGS
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={params.additionalFlags}
              onChange={(e) => setParams({ ...params, additionalFlags: e.target.value })}
              onFocus={() => setShowFlagSuggestions(true)}
              onBlur={() => setTimeout(() => setShowFlagSuggestions(false), 150)}
              placeholder="-passive -active -brute -v"
              className="w-full box-border p-2.5 rounded text-[12px] font-mono font-inherit outline-none transition-colors bg-input-background border border-input-border-default text-text-primary placeholder:text-text-secondary"
            />
            {showFlagSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-md z-10 max-h-[150px] overflow-y-auto border border-border bg-[#0a0f19]">
                {COMMON_FLAGS.filter(flag => 
                  !params.additionalFlags.includes(flag.value) &&
                  (flag.label.toLowerCase().includes(params.additionalFlags.toLowerCase()) ||
                   flag.desc.toLowerCase().includes(params.additionalFlags.toLowerCase()))
                ).slice(0, 10).map((flag, i) => (
                  <div
                    key={flag.value}
                    onClick={() => {
                      const currentFlags = params.additionalFlags.split(' ').filter(f => f.trim());
                      if (!currentFlags.includes(flag.value)) {
                        const newFlags = [...currentFlags, flag.value].join(' ');
                        setParams({ ...params, additionalFlags: newFlags });
                      }
                      setShowFlagSuggestions(false);
                    }}
                    className="p-1.5 cursor-pointer text-[11px] transition-colors text-text-primary hover:bg-dropdown-item-hover flex justify-between items-center"
                    style={{ borderBottom: i < 9 ? '1px solid var(--border)' : 'none' }}
                  >
                    <span className="font-mono">{flag.label}</span>
                    <span className="text-[9px] text-text-secondary">{flag.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {params.additionalFlags.split(' ').filter(f => f.trim()).map((flag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/30"
              >
                {flag}
                <button
                  onClick={() => {
                    const newFlags = params.additionalFlags.split(' ').filter(f => f !== flag).join(' ');
                    setParams({ ...params, additionalFlags: newFlags });
                  }}
                  className="ml-1 hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* Footer with Save Profile and Execute buttons */}
      <div className="flex justify-between items-center gap-3 pt-4 mt-2 border-t border-border">
        <div className="flex-1" />
        <div className="flex gap-3">
          {(() => {
            const isProfileExists = savedProfiles.some(
              (profile) =>
                profile.params.target === params.target &&
                profile.params.mode === params.mode &&
                profile.params.dnsQps === params.dnsQps &&
                profile.params.timeout === params.timeout &&
                profile.params.passiveOnly === params.passiveOnly &&
                profile.params.activeEnabled === params.activeEnabled &&
                profile.params.bruteForce === params.bruteForce &&
                profile.params.includeSources === params.includeSources &&
                profile.params.outputFormat === params.outputFormat &&
                profile.params.additionalFlags === params.additionalFlags
            );
            const isSaveDisabled = scanning || !params.target.trim() || isProfileExists;
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
            disabled={scanning || !params.target.trim()}
            className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold tracking-wide font-inherit transition-all bg-primary text-text-foreground disabled:bg-input-background disabled:text-text-secondary disabled:cursor-not-allowed rounded"
            style={{
              border: `1px solid ${scanning || !params.target.trim() ? 'var(--input-border-default)' : 'transparent'}`,
              boxShadow: scanning || !params.target.trim() ? 'none' : `0 0 18px ${glow}`,
            }}
          >
            <Play size={14} />
            {scanning ? 'ENUMERATING...' : 'EXECUTE SCAN'}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {scanning && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] tracking-wide font-mono text-text-secondary">
              {params.target}
            </span>
            <span className="text-[10px] font-mono" style={{ color: accentColor }}>
              {progress}%
            </span>
          </div>
          <div className="h-px rounded-sm overflow-hidden bg-divider">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${accentColor}60, ${accentColor})`,
                boxShadow: `0 0 6px ${accentColor}`,
              }}
            />
          </div>
        </div>
      )}

      {/* ── Scan Log Output ──────────────────────────────────────────── */}
      {(scanning || logOutput) && (
        <div>
          <label className="block text-xs font-bold tracking-wide mb-1.5 text-text-secondary">
            SCAN LOG OUTPUT
          </label>
          <div
            className="rounded-md overflow-hidden"
            style={{ border: `1px solid ${accentColor}30`, minHeight: 250 }}
          >
            <CodeBlock
              code={logOutput || 'Waiting for scan to start...'}
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
