import React, { useState, useRef, useEffect } from 'react';
import { NmapScanParams, TooltipState } from '../types';
import { buildCommand } from '../utils';
import { SCAN_TYPES, TIMING_LABELS, COMMON_FLAGS } from '../constants';
import { CodeBlock } from '../../../../../../components/common/CodeBlock';

// ─── Flag Accordion ────────────────────────────────────────────────────────────

interface FlagCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  flags: Array<{ value: string; label: string; desc: string }>;
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

// ─── Main Component ─────────────────────────────────────────────────────────

interface ExecutionTabProps {
  params: NmapScanParams;
  setParams: React.Dispatch<React.SetStateAction<NmapScanParams>>;
  scanning: boolean;
  progress: number;
  logOutput: string;
  onScan: () => void;
  accentColor: string;
  glow: string;
  targetHistory: string[];
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
  targetHistory,
  onTooltipShow,
}) => {
  const [showTargetSuggestions, setShowTargetSuggestions] = useState(false);
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

  // ── Flag categories ─────────────────────────────────────────────────────
  const FLAG_CATEGORIES: FlagCategory[] = [
    {
      id: 'discovery',
      label: 'HOST DISCOVERY',
      icon: '⬡',
      flags: COMMON_FLAGS.filter((f) =>
        [
          '-Pn',
          '-PS',
          '-PA',
          '-PU',
          '-PY',
          '-PE',
          '-PP',
          '-PM',
          '-PO',
          '-n',
          '-R',
          '--system-dns',
          '-6',
        ].includes(f.value),
      ),
    },
    {
      id: 'detection',
      label: 'OS & SERVICE DETECTION',
      icon: '◈',
      flags: COMMON_FLAGS.filter((f) =>
        [
          '-A',
          '-O',
          '--osscan-guess',
          '-sV',
          '--version-intensity',
          '--version-light',
          '--version-all',
          '--script vuln',
          '--script default',
          '-sC',
          '--script',
          '--script-trace',
        ].includes(f.value),
      ),
    },
    {
      id: 'evasion',
      label: 'EVASION & FIREWALL BYPASS',
      icon: '◎',
      flags: COMMON_FLAGS.filter((f) =>
        [
          '-f',
          '-ff',
          '--mtu',
          '-D',
          '-S',
          '-e',
          '-g',
          '--source-port',
          '--data-length',
          '--ip-options',
          '--ttl',
          '--spoof-mac',
          '--badsum',
        ].includes(f.value),
      ),
    },
    {
      id: 'output',
      label: 'OUTPUT & VERBOSE',
      icon: '▤',
      flags: COMMON_FLAGS.filter((f) =>
        [
          '-oN',
          '-oX',
          '-oG',
          '-oA',
          '-v',
          '-vv',
          '-d',
          '--reason',
          '--open',
          '--packet-trace',
          '--append-output',
        ].includes(f.value),
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {/* ── Command Preview ───────────────────────────────────────────── */}
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Target ───────────────────────────────────────────────────── */}
      <div className="relative">
        <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
          <span
            onMouseEnter={(e) =>
              showTooltip(
                'Địa chỉ IP, tên miền hoặc dải mạng cần quét. Ví dụ: 192.168.1.1, example.com, 10.0.0.0/24',
                e,
              )
            }
            onMouseLeave={() => onTooltipShow(null)}
          >
            TARGET <span className="text-red-500 text-sm align-middle ml-0.5">*</span>
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
          placeholder="192.168.1.1  ·  example.com  ·  10.0.0.0/24"
          className="w-full box-border p-2.5 rounded text-[13px] font-inherit outline-none transition-colors bg-input-background text-text-primary placeholder:text-text-secondary border border-border"
          style={{
            borderColor: params.target ? accentColor + '50' : undefined,
            boxShadow: params.target ? `0 0 10px ${glow}` : 'none',
          }}
        />
        {showTargetSuggestions && targetHistory.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-md z-10 max-h-[180px] overflow-y-auto bg-dropdown-content-background"
            style={{ border: `1px solid ${accentColor}30` }}
          >
            {targetHistory.map((t, i) => (
              <div
                key={i}
                onClick={() => {
                  setParams({ ...params, target: t });
                  setShowTargetSuggestions(false);
                }}
                className="p-2 cursor-pointer text-[12px] transition-colors text-text-primary"
                style={{
                  borderBottom: i < targetHistory.length - 1 ? '1px solid var(--border)' : 'none',
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

      {/* ── Ports + Timing (row) ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
            <span
              onMouseEnter={(e) =>
                showTooltip(
                  'Cổng cần quét. Định dạng: cổng đơn (22,80), dải (1-1000). Để trống để quét các cổng phổ biến.',
                  e,
                )
              }
              onMouseLeave={() => onTooltipShow(null)}
            >
              PORTS <span className="font-normal text-text-secondary">(optional)</span>
            </span>
          </label>
          <input
            type="text"
            value={params.ports}
            onChange={(e) => setParams({ ...params, ports: e.target.value })}
placeholder="22,80,443  ·  1-1000"
            className="w-full box-border p-2.5 rounded text-[12px] font-inherit outline-none transition-colors bg-input-background border border-input-border-default text-text-primary placeholder:text-text-secondary"
          />
        </div>

        <div>
          <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
            <span
              onMouseEnter={(e) =>
                showTooltip(
                  'Tốc độ quét: T0 (chậm nhất, tránh IDS) → T5 (nhanh nhất, dễ bị phát hiện).',
                  e,
                )
              }
              onMouseLeave={() => onTooltipShow(null)}
            >
              TIMING — <span style={{ color: accentColor }}>{TIMING_LABELS[parseInt(params.timing)]}</span> <span className="text-red-500 text-sm align-middle ml-0.5">*</span>
            </span>
          </label>
          <div className="flex gap-1">
            {(['0', '1', '2', '3', '4', '5'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setParams({ ...params, timing: t })}
                onMouseEnter={(e) => showTooltip(`T${t} — ${TIMING_LABELS[parseInt(t)]}`, e)}
                onMouseLeave={() => onTooltipShow(null)}
                className={`flex-1 py-2 rounded text-xs font-bold cursor-pointer font-inherit transition-all ${
                  params.timing === t
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'bg-input-background text-text-secondary border-input-border-default'
                }`}
                style={{
                  border: `1px solid ${params.timing === t ? 'rgb(var(--primary))' : 'var(--input-border-default)'}`,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scan Type (horizontal pills) ────────────────────────────── */}
      <div>
        <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
          <span
            onMouseEnter={(e) =>
              showTooltip(
                'Phương thức quét cổng: SYN (stealth, cần root), TCP Connect (full handshake), UDP, Ping Sweep',
                e,
              )
            }
            onMouseLeave={() => onTooltipShow(null)}
          >
            SCAN TYPE <span className="text-red-500 text-sm align-middle ml-0.5">*</span>
          </span>
        </label>
        <div className="flex gap-1.5">
          {SCAN_TYPES.map((st) => {
            const active = params.scanType === st.value;
            return (
              <button
                key={st.value}
                onClick={() => setParams({ ...params, scanType: st.value as any })}
                onMouseEnter={(e) => {
                  showTooltip(st.note, e);
                  if (!active) e.currentTarget.style.borderColor = 'var(--input-border-default)';
                }}
                onMouseLeave={(e) => {
                  onTooltipShow(null);
                  if (!active) e.currentTarget.style.borderColor = 'var(--input-border-default)';
                }}
                className={`flex-1 py-2 px-2 rounded font-mono transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  active
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'bg-input-background text-text-secondary border-input-border-default'
                }`}
                style={{
                  border: `1px solid ${active ? 'rgb(var(--primary))' : 'var(--input-border-default)'}`,
                }}
              >
                <span className="text-[11px] font-bold">
                  {st.flag}
                </span>
                <span className="text-[10px]">
                  {st.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Flag Input Fields (2x2 grid) ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {FLAG_CATEGORIES.map((cat) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const [showSuggestions, setShowSuggestions] = useState(false);
          const containerRef = useRef<HTMLDivElement>(null);
          
          // Close dropdown when clicking outside
          useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
              if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
              }
            };
            if (showSuggestions) {
              document.addEventListener('mousedown', handleClickOutside);
            }
            return () => {
              document.removeEventListener('mousedown', handleClickOutside);
            };
          }, [showSuggestions]);
          
          // Lọc các flags đang active thuộc category này
          const activeFlagsInCat = cat.flags.filter((f) =>
            params.additionalFlags.includes(f.value)
          );
          const inputValue = activeFlagsInCat.map((f) => f.value).join(' ');
          
          // Hiển thị tất cả flags (không lọc)
          const allFlags = cat.flags;
          
          const toggleFlag = (flagValue: string) => {
            const currentFlags = params.additionalFlags.split(' ').filter(Boolean);
            if (currentFlags.includes(flagValue)) {
              // Nếu đã có thì xóa
              setParams({
                ...params,
                additionalFlags: currentFlags.filter((f) => f !== flagValue).join(' '),
              });
            } else {
              // Nếu chưa có thì thêm
              setParams({ ...params, additionalFlags: [...currentFlags, flagValue].join(' ') });
            }
          };
          
          // const removeFlag = (flagValue: string) => {
          //   const currentFlags = params.additionalFlags.split(' ').filter(Boolean);
          //   setParams({
          //     ...params,
          //     additionalFlags: currentFlags.filter((f) => f !== flagValue).join(' '),
          //   });
          // };
          
          return (
            <div key={cat.id} ref={containerRef}>
              <label className="block text-xs font-bold tracking-wide mb-1.5 cursor-default text-text-secondary">
                <span
                  onMouseEnter={(e) => {
                    const flagList = cat.flags.map((f) => `${f.value} (${f.desc})`).join(', ');
                    showTooltip(`${cat.label}: ${flagList}`, e);
                  }}
                  onMouseLeave={() => onTooltipShow(null)}
                >
                  {cat.label}
                </span>
              </label>
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    readOnly
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={`e.g., ${cat.flags.slice(0, 3).map((f) => f.value).join(', ')}...`}
                    className="w-full box-border p-2.5 rounded text-[12px] font-inherit outline-none transition-colors bg-input-background border border-border text-text-primary placeholder:text-text-secondary pr-8 cursor-pointer"
                  />
                  {showSuggestions && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowSuggestions(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
                {showSuggestions && allFlags.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-md z-10 max-h-[200px] overflow-y-auto bg-dropdown-content-background border border-border shadow-lg">
                    {allFlags.map((flag) => {
                      const isActive = activeFlagsInCat.some((f) => f.value === flag.value);
                      return (
                        <div
                          key={flag.value}
                          onClick={() => toggleFlag(flag.value)}
                          className={`p-2 cursor-pointer text-[12px] transition-colors hover:bg-dropdown-item-hover text-text-primary ${
                            isActive ? 'bg-primary/10 text-primary' : ''
                          }`}
                        >
                          <span className="font-mono">{flag.value}</span>
                          <span className="text-text-secondary ml-2 text-[10px]">{flag.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* No badges - removed as requested */}
            </div>
          );
        })}
      </div>

      {/* ── Execute Button ───────────────────────────────────────────── */}
      <button
        onClick={onScan}
        disabled={scanning || !params.target.trim()}
        className="w-full py-3 text-[12px] font-bold tracking-wide font-inherit transition-all mt-1 bg-primary text-text-foreground disabled:bg-input-background disabled:text-text-secondary disabled:cursor-not-allowed rounded"
        style={{
          border: `1px solid ${scanning || !params.target.trim() ? 'var(--input-border-default)' : 'transparent'}`,
          boxShadow: scanning || !params.target.trim() ? 'none' : `0 0 18px ${glow}`,
        }}
      >
        {scanning ? '▸ SCANNING...' : '▸ EXECUTE SCAN'}
      </button>

      {/* ── Progress Bar ─────────────────────────────────────────────── */}
      {scanning && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] tracking-wide font-mono text-text-secondary">{params.target}</span>
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
            style={{
              border: `1px solid ${accentColor}30`,
              minHeight: 250,
            }}
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