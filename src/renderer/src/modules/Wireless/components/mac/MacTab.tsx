// ============================================================================
// MacTab — MAC address spoofing management
// ============================================================================

import { useState } from 'react';
import type { MacEntry } from '../../types';
import { Panel } from '../shared/Panel';
import { Btn } from '../shared/Btn';
import { $ } from '@renderer/utils/color';

// Helper function to resolve color from CSS variable or hex
function resolveColor(color: string): string {
  const colorMap: Record<string, string> = {
    '--success': '#10b981',
    '--text-secondary': '#9ca3af',
    '--error': '#ef4444',
    '--warning': '#f59e0b',
    '--primary': '#3686ff',
  };
  if (!color.startsWith('var(--')) {
    return color;
  }
  return colorMap[color] || color;
}

// Inline Badge component
function Badge({ label, color }: { label: string; color: string }) {
  const resolvedColor = resolveColor(color);
  return (
    <span
      className="font-bold rounded tracking-[0.08em] font-mono"
      style={{
        fontSize: 8,
        padding: '1px 5px',
        border: `1px solid ${resolvedColor}80`,
        background: `${resolvedColor}20`,
        color: resolvedColor,
      }}
    >
      {label}
    </span>
  );
}

interface MacTabProps {
  entries: MacEntry[];
  onAdd: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: $('--input-background'),
  border: '1px solid ' + ($('--border') || ''),
  color: $('--text-secondary'),
  fontSize: 9,
  padding: '5px 8px',
  borderRadius: 4,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
};

const labelStyle: React.CSSProperties = {
  fontSize: 8,
  color: $('--text-secondary'),
  marginBottom: 4,
  fontWeight: 700,
};

export function MacTab({ entries, onAdd }: MacTabProps) {
  const [iface, setIface] = useState('wlan0');
  const [targetMac, setTargetMac] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'manual' | 'random' | 'clone'>('random');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel title="MAC Spoof Configuration" accent={$('--success') || '#10b981'}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <div style={labelStyle}>INTERFACE</div>
            <select value={iface} onChange={(e) => setIface(e.target.value)} style={selectStyle}>
              {['wlan0', 'wlan1', 'eth0', 'eth1'].map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={labelStyle}>MODE</div>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              style={selectStyle}
            >
              <option value="random">Random MAC</option>
              <option value="manual">Manual MAC</option>
              <option value="clone">Clone from Client</option>
            </select>
          </div>
          <div>
            <div style={labelStyle}>TARGET MAC {mode === 'random' && '(auto)'}</div>
            <input
              value={targetMac}
              onChange={(e) => setTargetMac(e.target.value)}
              placeholder={mode === 'random' ? 'XX:XX:XX:XX:XX:XX' : 'AA:BB:CC:DD:EE:FF'}
              disabled={mode === 'random'}
              style={{
                ...inputStyle,
                background: mode === 'random' ? $('--background') : $('--input-background'),
              }}
            />
          </div>
          <div>
            <div style={labelStyle}>REASON</div>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Bypass MAC filter"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn
            label="⚡ APPLY SPOOF"
            color={$('--success') || '#10b981'}
            onClick={onAdd}
            size="sm"
          />
          <Btn label="↩ RESTORE ORIGINAL" color={$('--warning') || '#f59e0b'} size="sm" />
          <Btn label="🔄 RANDOM & APPLY" color={$('--text-secondary') || '#9ca3af'} size="sm" />
        </div>
      </Panel>

      <Panel title="MAC History / Active Spoofs" accent={$('--success') || '#10b981'}>
        {entries.length === 0 ? (
          <div
            style={{ fontSize: 9, color: $('--text-secondary'), padding: 16, textAlign: 'center' }}
          >
            No MAC changes recorded.
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 130px 130px 100px 1fr 70px',
                gap: 6,
                padding: '4px 8px',
                marginBottom: 5,
                borderBottom: '1px solid ' + ($('--border') || ''),
              }}
            >
              {['IFACE', 'ORIGINAL MAC', 'CURRENT MAC', 'STATUS', 'REASON', 'TIME'].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 8,
                    color: $('--text-secondary'),
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
            {entries.map((e) => (
              <div
                key={e.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 130px 130px 100px 1fr 70px',
                  gap: 6,
                  padding: '6px 8px',
                  borderBottom: '1px solid ' + ($('--divider') || ''),
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 9, color: $('--text-secondary') }}>{e.interface}</span>
                <span style={{ fontSize: 9, color: $('--text-secondary') }}>{e.originalMac}</span>
                <span
                  style={{
                    fontSize: 9,
                    color: e.spoofed ? $('--green') : $('--text-secondary'),
                    fontWeight: e.spoofed ? 700 : 400,
                  }}
                >
                  {e.currentMac}
                </span>
                <Badge
                  label={e.spoofed ? '● SPOOFED' : '○ ORIGINAL'}
                  color={e.spoofed ? $('--green') : $('--text-secondary')}
                />
                <span style={{ fontSize: 9, color: $('--text-secondary') }}>{e.reason}</span>
                <span style={{ fontSize: 8, color: $('--text-secondary') }}>{e.timestamp}</span>
              </div>
            ))}
          </>
        )}
      </Panel>
    </div>
  );
}
