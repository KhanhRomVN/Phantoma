import React, { useState, useRef } from 'react';
import { NmapScanParams, TooltipState } from '../types';
import { buildCommand } from '../utils';
import { SCAN_TYPES, TIMING_LABELS, COMMON_FLAGS } from '../constants';

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
  const [open, setOpen] = useState(false);
  const activeCount = category.flags.filter((f) => activeFlags.includes(f.value)).length;

  const showTooltip = (text: string, e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onTooltipShow({ text, x: rect.left, y: rect.bottom + 6 });
  };

  return (
    <div
      style={{
        borderRadius: 6,
        border: `1px solid ${open ? accentColor + '30' : '#1a2236'}`,
        background: open ? '#0a0f1a' : '#0d1117',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <span style={{ color: open ? accentColor : '#475569', fontSize: 13, flexShrink: 0 }}>
          {category.icon}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: open ? '#94a3b8' : '#475569',
          }}
        >
          <span
            onMouseEnter={(e) => {
              const flagList = category.flags.map(f => f.value).join(', ');
              showTooltip(`${category.label}: ${flagList}`, e);
            }}
            onMouseLeave={() => onTooltipShow(null)}
          >
            {category.label}
          </span>
        </span>
        {activeCount > 0 && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: accentColor,
              background: accentColor + '20',
              border: `1px solid ${accentColor}40`,
              borderRadius: 10,
              padding: '1px 7px',
            }}
          >
            {activeCount}
          </span>
        )}
        <span
          style={{
            fontSize: 10,
            color: '#334155',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        >
          ▾
        </span>
      </button>

      {/* Flag Pills */}
      {open && (
        <div
          style={{
            padding: '8px 14px 12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 5,
            borderTop: '1px solid #131c2e',
          }}
        >
          {category.flags.map((flag) => {
            const active = activeFlags.includes(flag.value);
            return (
              <button
                key={flag.value}
                onClick={() => onToggle(flag.value)}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = accentColor + '50';
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.background = accentColor + '08';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = '#1e2d45';
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
                style={{
                  display: 'inline-flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: 4,
                  border: `1px solid ${active ? accentColor + '60' : '#1e2d45'}`,
                  background: active ? glow : 'transparent',
                  color: active ? accentColor : '#9ca3af',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  transition: 'all 0.12s',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{flag.label}</span>
                <span
                  style={{
                    fontSize: 9,
                    color: '#8a9aba',
                    opacity: 0.7,
                    fontWeight: 400,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {flag.desc}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

interface ExecutionTabProps {
  params: NmapScanParams;
  setParams: React.Dispatch<React.SetStateAction<NmapScanParams>>;
  scanning: boolean;
  progress: number;
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

  const inputBase: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 13px',
    background: '#0d1117',
    border: '1px solid #1a2236',
    borderRadius: 4,
    color: '#cbd5e1',
    fontSize: 12,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  // Placeholder style
  const placeholderStyle = {
    '::placeholder': {
      color: '#1e2d45',
      opacity: 0.7,
      fontSize: 11,
    },
  } as any;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Command Preview ───────────────────────────────────────────── */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            color: '#9ca3af',
            letterSpacing: '0.12em',
            marginBottom: 6,
            cursor: 'default',
          }}
        >
          COMMAND PREVIEW
        </label>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 5,
            background: '#060a11',
            border: '1px solid #131c2e',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: '#334155', fontSize: 12, fontFamily: 'monospace', flexShrink: 0 }}>
            $
          </span>
          <span
            style={{
              fontSize: 12,
              color: '#64748b',
              fontFamily: 'monospace',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
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
              (e.currentTarget as HTMLButtonElement).style.color = '#334155';
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#334155',
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
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

      {/* ── Target ───────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            color: '#9ca3af',
            letterSpacing: '0.12em',
            marginBottom: 6,
            cursor: 'default',
          }}
        >
          <span
            onMouseEnter={(e) =>
              showTooltip(
                'Địa chỉ IP, tên miền hoặc dải mạng cần quét. Ví dụ: 192.168.1.1, example.com, 10.0.0.0/24',
                e,
              )
            }
            onMouseLeave={() => onTooltipShow(null)}
          >
            TARGET
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
          style={{
            ...inputBase,
            border: `1px solid ${params.target ? accentColor + '50' : '#1a2236'}`,
            boxShadow: params.target ? `0 0 10px ${glow}` : 'none',
            fontSize: 13,
            padding: '11px 14px',
            ...placeholderStyle,
          }}
        />
        {showTargetSuggestions && targetHistory.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 3,
              background: '#0d1117',
              border: `1px solid ${accentColor}30`,
              borderRadius: 4,
              zIndex: 10,
              maxHeight: 180,
              overflowY: 'auto',
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
                  color: '#94a3b8',
                  borderBottom: i < targetHistory.length - 1 ? '1px solid #1a2236' : 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#111827')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {t}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Ports + Timing (row) ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Ports */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: '#9ca3af',
              letterSpacing: '0.12em',
              marginBottom: 6,
              cursor: 'default',
            }}
          >
            <span
              onMouseEnter={(e) =>
                showTooltip(
                  'Cổng cần quét. Định dạng: cổng đơn (22,80), dải (1-1000). Để trống để quét các cổng phổ biến.',
                  e,
                )
              }
              onMouseLeave={() => onTooltipShow(null)}
            >
              PORTS <span style={{ fontWeight: 400, color: '#6b7a96' }}>(optional)</span>
            </span>
          </label>
          <input
            type="text"
            value={params.ports}
            onChange={(e) => setParams({ ...params, ports: e.target.value })}
            placeholder="22,80,443  ·  1-1000"
            style={{
              ...inputBase,
              ...placeholderStyle,
            }}
          />
        </div>

        {/* Timing */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: '#9ca3af',
              letterSpacing: '0.12em',
              marginBottom: 6,
              cursor: 'default',
            }}
          >
            <span
              onMouseEnter={(e) =>
                showTooltip(
                  'Tốc độ quét: T0 (chậm nhất, tránh IDS) → T5 (nhanh nhất, dễ bị phát hiện).',
                  e,
                )
              }
              onMouseLeave={() => onTooltipShow(null)}
            >
              TIMING —{' '}
              <span style={{ color: accentColor }}>{TIMING_LABELS[parseInt(params.timing)]}</span>
            </span>
          </label>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['0', '1', '2', '3', '4', '5'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setParams({ ...params, timing: t })}
                onMouseEnter={(e) => showTooltip(`T${t} — ${TIMING_LABELS[parseInt(t)]}`, e)}
                onMouseLeave={() => onTooltipShow(null)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 3,
                  border: `1px solid ${params.timing === t ? accentColor + '60' : '#1a2236'}`,
                  background: params.timing === t ? glow : '#0d1117',
                  color: params.timing === t ? accentColor : '#3d5068',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.12s',
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
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            color: '#9ca3af',
            letterSpacing: '0.12em',
            marginBottom: 7,
            cursor: 'default',
          }}
        >
          <span
            onMouseEnter={(e) =>
              showTooltip(
                'Phương thức quét cổng: SYN (stealth, cần root), TCP Connect (full handshake), UDP, Ping Sweep',
                e,
              )
            }
            onMouseLeave={() => onTooltipShow(null)}
          >
            SCAN TYPE
          </span>
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {SCAN_TYPES.map((st) => {
            const active = params.scanType === st.value;
            return (
              <button
                key={st.value}
                onClick={() => setParams({ ...params, scanType: st.value as any })}
                onMouseEnter={(e) => {
                  showTooltip(st.note, e);
                  if (!active) e.currentTarget.style.borderColor = accentColor + '35';
                }}
                onMouseLeave={(e) => {
                  onTooltipShow(null);
                  if (!active) e.currentTarget.style.borderColor = '#1a2236';
                }}
                style={{
                  flex: 1,
                  padding: '8px 8px',
                  borderRadius: 4,
                  border: `1px solid ${active ? accentColor + '60' : '#1a2236'}`,
                  background: active ? glow : '#0d1117',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  transition: 'all 0.12s',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{ fontSize: 11, fontWeight: 700, color: active ? accentColor : '#9ca3af' }}
                >
                  {st.flag}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: active ? accentColor + 'aa' : '#4a5a7a',
                  }}
                >
                  {st.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Flag Accordions ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {FLAG_CATEGORIES.map((cat) => (
          <FlagAccordion
            key={cat.id}
            category={cat}
            activeFlags={params.additionalFlags}
            onToggle={toggleFlag}
            accentColor={accentColor}
            glow={glow}
            onTooltipShow={onTooltipShow}
          />
        ))}
      </div>

      {/* ── Execute Button ───────────────────────────────────────────── */}
      <button
        onClick={onScan}
        disabled={scanning || !params.target.trim()}
        style={{
          width: '100%',
          padding: '12px',
          background:
            scanning || !params.target.trim()
              ? '#0d1117'
              : `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`,
          border: `1px solid ${scanning || !params.target.trim() ? '#1a2236' : accentColor + '70'}`,
          borderRadius: 5,
          color: scanning || !params.target.trim() ? '#334155' : accentColor,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.15em',
          cursor: scanning || !params.target.trim() ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          boxShadow: scanning || !params.target.trim() ? 'none' : `0 0 18px ${glow}`,
          transition: 'all 0.2s',
          marginTop: 3,
        }}
      >
        {scanning ? '▸ SCANNING...' : '▸ EXECUTE SCAN'}
      </button>

      {/* ── Progress Bar ─────────────────────────────────────────────── */}
      {scanning && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span
              style={{
                fontSize: 10,
                color: '#4a5a7a',
                letterSpacing: '0.1em',
                fontFamily: 'monospace',
              }}
            >
              {params.target}
            </span>
            <span style={{ fontSize: 10, color: accentColor, fontFamily: 'monospace' }}>
              {progress}%
            </span>
          </div>
          <div style={{ height: 1, background: '#131c2e', borderRadius: 1, overflow: 'hidden' }}>
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
    </div>
  );
};

export default ExecutionTab;
