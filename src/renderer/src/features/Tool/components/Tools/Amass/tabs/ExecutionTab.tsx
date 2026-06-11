import React, { useState, useRef } from 'react';
import { AmassScanParams, TooltipState } from '../types';
import { buildCommand } from '../utils';
import { MODES, OUTPUT_FORMATS, COMMON_FLAGS, DATA_SOURCES } from '../constants';
import { CodeBlock } from '../../../../../../components/common/CodeBlock';

interface ExecutionTabProps {
  params: AmassScanParams;
  setParams: React.Dispatch<React.SetStateAction<AmassScanParams>>;
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
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
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

  const placeholderStyle = {
    '::placeholder': {
      color: 'var(--text-secondary)',
      opacity: 0.7,
      fontSize: 11,
    },
  } as any;

  // Filtered sources for autocomplete
  const filteredSources = DATA_SOURCES.filter(s => 
    params.includeSources.toLowerCase().includes(s.toLowerCase()) || 
    s.toLowerCase().includes(params.includeSources.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Command Preview */}
      <div>
<label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', marginBottom: 6 }}>
          COMMAND PREVIEW
        </label>
        <div style={{ padding: '10px 14px', borderRadius: 5, background: 'var(--input-background)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'monospace', flexShrink: 0 }}>$</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {buildCommand(params)}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(buildCommand(params))}
            onMouseEnter={(e) => { showTooltip('Copy command to clipboard', e); (e.currentTarget as HTMLButtonElement).style.color = accentColor; }}
onMouseLeave={(e) => { onTooltipShow(null); (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)', transition: 'color 0.15s', flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Target */}
      <div style={{ position: 'relative' }}>
<label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', marginBottom: 6 }}>
          <span onMouseEnter={(e) => showTooltip('Domain target để enumerate subdomain. Ví dụ: example.com', e)} onMouseLeave={() => onTooltipShow(null)}>
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
          style={{
            ...inputBase,
            border: `1px solid ${params.target ? accentColor + '50' : 'var(--input-border-default)'}`,
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
              background: 'var(--dropdown-background)',
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
                  color: 'var(--text-primary)',
                  borderBottom: i < targetHistory.length - 1 ? '1px solid var(--border)' : 'none',
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

      {/* Mode + DNS QPS + Timeout Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'end' }}>
        {/* MODE */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', marginBottom: 7, cursor: 'default' }}>
            <span onMouseEnter={(e) => showTooltip('Enumeration: tìm subdomain từ các nguồn dữ liệu. Intelligence: thu thập thông tin ASN/whois.', e)} onMouseLeave={() => onTooltipShow(null)}>
              MODE
            </span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {MODES.map((mode) => {
              const active = params.mode === mode.value;
              return (
                <button
                  key={mode.value}
                  onClick={() => setParams({ ...params, mode: mode.value as any })}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 4, border: `1px solid ${active ? accentColor + '60' : 'var(--input-border-default)'}`, background: active ? glow : 'var(--input-background)', cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.12s', textAlign: 'center' }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: active ? accentColor : 'var(--text-secondary)', display: 'block' }}>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* DNS QPS */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', marginBottom: 7, cursor: 'default' }}>
            <span onMouseEnter={(e) => showTooltip('DNS queries per second — giới hạn tốc độ truy vấn DNS để tránh bị chặn (rate limiting).', e)} onMouseLeave={() => onTooltipShow(null)}>
              DNS QPS
            </span>
          </label>
          <input type="number" value={params.dnsQps} onChange={(e) => setParams({ ...params, dnsQps: parseInt(e.target.value) || 10 })} min={1} max={100} style={inputBase} />
        </div>
        {/* TIMEOUT */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', marginBottom: 7, cursor: 'default' }}>
            <span onMouseEnter={(e) => showTooltip('Thời gian chờ tối đa (giây) cho mỗi tác vụ enumeration trước khi timeout.', e)} onMouseLeave={() => onTooltipShow(null)}>
              TIMEOUT (s)
            </span>
          </label>
          <input type="number" value={params.timeout} onChange={(e) => setParams({ ...params, timeout: parseInt(e.target.value) || 60 })} min={10} max={600} style={inputBase} />
        </div>
      </div>

      {/* Enumeration Type - Passive/Active/Brute */}
      <div>
<label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', marginBottom: 7, cursor: 'default' }}>
          <span onMouseEnter={(e) => showTooltip('Passive: không gửi request trực tiếp. Active: DNS resolution & zone transfer. Brute Force: thử hàng loạt subdomain phổ biến.', e)} onMouseLeave={() => onTooltipShow(null)}>
            ENUMERATION TYPE
          </span>
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setParams({ ...params, passiveOnly: true, activeEnabled: false })}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 4, border: `1px solid ${params.passiveOnly && !params.activeEnabled ? accentColor + '60' : 'var(--input-border-default)'}`, background: params.passiveOnly && !params.activeEnabled ? glow : 'var(--input-background)', color: params.passiveOnly && !params.activeEnabled ? accentColor : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600 }}
          >
            Passive Only
          </button>
          <button
            onClick={() => setParams({ ...params, passiveOnly: false, activeEnabled: true })}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 4, border: `1px solid ${params.activeEnabled && !params.passiveOnly ? accentColor + '60' : 'var(--input-border-default)'}`, background: params.activeEnabled && !params.passiveOnly ? glow : 'var(--input-background)', color: params.activeEnabled && !params.passiveOnly ? accentColor : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600 }}
          >
            Active + Passive
          </button>
          <button
            onClick={() => setParams({ ...params, bruteForce: !params.bruteForce })}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 4, border: `1px solid ${params.bruteForce ? accentColor + '60' : 'var(--input-border-default)'}`, background: params.bruteForce ? glow : 'var(--input-background)', color: params.bruteForce ? accentColor : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600 }}
          >
            Brute Force
          </button>
        </div>
      </div>

      {/* Data Sources Section */}
      <div>
<label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', marginBottom: 6 }}>
          <span onMouseEnter={(e) => showTooltip('Chỉ định nguồn dữ liệu để thu thập (cách nhau bằng dấu phẩy)', e)} onMouseLeave={() => onTooltipShow(null)}>
            DATA SOURCES
          </span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={params.includeSources}
            onChange={(e) => setParams({ ...params, includeSources: e.target.value })}
            onFocus={() => setShowSourceSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSourceSuggestions(false), 150)}
            placeholder="crtsh,alienvault,wayback (để trống = tất cả nguồn)"
            style={inputBase}
          />
          {showSourceSuggestions && filteredSources.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 3, background: 'var(--dropdown-background)', border: `1px solid ${accentColor}30`, borderRadius: 4, zIndex: 10, maxHeight: 150, overflowY: 'auto' }}>
              {filteredSources.map((src, i) => (
                <div key={i} onClick={() => { const current = params.includeSources.split(',').filter(s => s.trim()); if (!current.includes(src)) { const newSources = [...current, src].join(','); setParams({ ...params, includeSources: newSources }); } setShowSourceSuggestions(false); }} style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 11, color: 'var(--text-primary)', borderBottom: i < filteredSources.length - 1 ? '1px solid var(--border)' : 'none' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dropdown-item-hover)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  {src}
                </div>
              ))}
            </div>
          )}
        </div>
<div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 4 }}>
          Available: crtsh, alienvault, wayback, shodan, censys, virustotal, dnsdb, ...
        </div>
      </div>

      {/* Output Format */}
      <div>
<label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', marginBottom: 6 }}>
          OUTPUT FORMAT
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {OUTPUT_FORMATS.map((fmt) => (
            <button key={fmt.value} onClick={() => setParams({ ...params, outputFormat: fmt.value as any })} style={{ flex: 1, padding: '8px', borderRadius: 4, border: `1px solid ${params.outputFormat === fmt.value ? accentColor + '60' : 'var(--input-border-default)'}`, background: params.outputFormat === fmt.value ? glow : 'var(--input-background)', color: params.outputFormat === fmt.value ? accentColor : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600 }}>
              {fmt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Additional Flags */}
      <div>
<label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', marginBottom: 6 }}>
          ADDITIONAL FLAGS
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {COMMON_FLAGS.map((flag) => {
            const active = params.additionalFlags.includes(flag.value);
            return (
              <button
                key={flag.value}
                onClick={() => toggleFlag(flag.value)}
                onMouseEnter={(e) => { showTooltip(flag.desc, e); if (!active) e.currentTarget.style.borderColor = accentColor + '50'; }}
                onMouseLeave={(e) => { onTooltipShow(null); if (!active) e.currentTarget.style.borderColor = 'var(--input-border-default)'; }}
                style={{ padding: '5px 10px', borderRadius: 4, border: `1px solid ${active ? accentColor + '60' : 'var(--input-border-default)'}`, background: active ? glow : 'transparent', color: active ? accentColor : 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.12s' }}
              >
                {flag.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Execute Button */}
      <button
        onClick={onScan}
        disabled={scanning || !params.target.trim()}
style={{ width: '100%', padding: '12px', background: scanning || !params.target.trim() ? 'var(--input-background)' : `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`, border: `1px solid ${scanning || !params.target.trim() ? 'var(--input-border-default)' : accentColor + '70'}`, borderRadius: 5, color: scanning || !params.target.trim() ? 'var(--text-secondary)' : accentColor, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', cursor: scanning || !params.target.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: scanning || !params.target.trim() ? 'none' : `0 0 18px ${glow}`, transition: 'all 0.2s', marginTop: 3 }}
      >
        {scanning ? '▸ ENUMERATING SUBDOMAINS...' : '▸ START AMASS ENUMERATION'}
      </button>

      {/* Progress Bar */}
      {scanning && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
<span style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.1em', fontFamily: 'monospace' }}>{params.target}</span>
            <span style={{ fontSize: 10, color: accentColor, fontFamily: 'monospace' }}>{progress}%</span>
          </div>
          <div style={{ height: 1, background: 'var(--divider)', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${accentColor}60, ${accentColor})`, boxShadow: `0 0 6px ${accentColor}`, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {/* ── Scan Log Output ──────────────────────────────────────────── */}
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
            SCAN LOG OUTPUT
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