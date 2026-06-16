// ============================================================================
// DeauthManager — Deauthentication attack manager
// ============================================================================

import { useState, useEffect } from 'react';
import type { WiFiNetwork, DeauthSession } from '../../types';
import { fmtNum } from '../../utils';
import { Panel } from '../shared/Panel';
import { Btn } from '../shared/Btn';

// Helper function to resolve color from CSS variable or hex
function resolveColor(color: string): string {
  const colorMap: Record<string, string> = {
    'var(--warning)': '#f59e0b',
    'var(--success)': '#10b981',
    'var(--error)': '#ef4444',
    'var(--primary)': '#3686ff',
    'var(--accent-purple)': '#a78bfa',
    'var(--text-secondary)': '#9ca3af',
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

interface DeauthManagerProps {
  sessions: DeauthSession[];
  networks: WiFiNetwork[];
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--input-background)',
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
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

export function DeauthManager({ sessions, networks }: DeauthManagerProps) {
  const [localSessions, setLocalSessions] = useState<DeauthSession[]>(sessions);
  const [targetNet, setTargetNet] = useState(networks[0]?.bssid ?? '');
  const [clientMac, setClientMac] = useState('FF:FF:FF:FF:FF:FF');
  const [pps, setPps] = useState(5);
  const [reason, setReason] = useState<DeauthSession['reason']>('handshake');

  useEffect(() => {
    const iv = setInterval(() => {
      setLocalSessions((prev) =>
        prev.map((s) =>
          s.status === 'running' ? { ...s, totalSent: s.totalSent + s.packetsPerSec } : s,
        ),
      );
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <Panel title="Deauthentication Manager · aireplay-ng -0" accent="var(--error)">
      <div className="grid grid-cols-[1fr_140px_80px_110px_100px] gap-2 mb-2.5 items-end">
        <div>
          <div className="text-[8px] text-text-secondary mb-1 font-bold">TARGET BSSID</div>
          <select
            value={targetNet}
            onChange={(e) => setTargetNet(e.target.value)}
            className="w-full bg-input-background border border-border text-text-secondary text-[9px] py-1.5 px-2 rounded font-mono outline-none"
          >
            {networks.map((n) => (
              <option key={n.bssid} value={n.bssid}>
                {n.ssid || '‹hidden›'} ({n.bssid})
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[8px] text-text-secondary mb-1 font-bold">CLIENT MAC</div>
          <input
            value={clientMac}
            onChange={(e) => setClientMac(e.target.value)}
            className="w-full bg-input-background border border-border text-text-secondary text-[9px] py-1.5 px-2 rounded font-mono outline-none"
          />
        </div>
        <div>
          <div className="text-[8px] text-text-secondary mb-1 font-bold">PKT/SEC</div>
          <input
            type="number"
            value={pps}
            onChange={(e) => setPps(Number(e.target.value))}
            min={1}
            max={50}
            className="w-full bg-input-background border border-border text-warning text-[10px] font-bold py-1.5 px-2 rounded font-mono outline-none"
          />
        </div>
        <div>
          <div className="text-[8px] text-text-secondary mb-1 font-bold">REASON</div>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as typeof reason)}
            className="w-full bg-input-background border border-border text-text-secondary text-[9px] py-1.5 px-2 rounded font-mono outline-none"
          >
            <option value="handshake">Handshake Capture</option>
            <option value="evil_twin">Evil Twin Prep</option>
            <option value="test">Connectivity Test</option>
          </select>
        </div>
        <div className="pt-3.5">
          <Btn
            label="⚡ LAUNCH"
            color="var(--error)"
            size="sm"
            onClick={() => {
              const net = networks.find((n) => n.bssid === targetNet);
              setLocalSessions((prev) => [
                ...prev,
                {
                  id: `da_${Date.now()}`,
                  targetBSSID: targetNet,
                  targetSSID: net?.ssid ?? 'Unknown',
                  clientMAC: clientMac,
                  packetsPerSec: pps,
                  totalSent: 0,
                  status: 'running',
                  startedAt: new Date().toLocaleTimeString(),
                  reason,
                },
              ]);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-[150px_130px_130px_60px_70px_70px_80px_60px] gap-1.5 py-1 border-b border-border mb-1.5">
        {[
          'TARGET SSID',
          'TARGET BSSID',
          'CLIENT MAC',
          'PPS',
          'TOTAL SENT',
          'STATUS',
          'REASON',
          'STARTED',
        ].map((h) => (
          <span
            key={h}
            className="text-[7px] text-text-secondary font-bold tracking-[0.1em]"
          >
            {h}
          </span>
        ))}
      </div>

      {localSessions.map((s) => (
        <div
          key={s.id}
          className="grid grid-cols-[150px_130px_130px_60px_70px_70px_80px_60px] gap-1.5 py-1.5 border-b border-divider items-center"
        >
          <span className="text-[9px] text-text-primary font-semibold">{s.targetSSID}</span>
          <span className="text-[8px] text-text-secondary">{s.targetBSSID}</span>
          <span
            className="text-[8px]"
            style={{ color: s.clientMAC === 'FF:FF:FF:FF:FF:FF' ? 'var(--yellow)' : 'var(--text-secondary)' }}
          >
            {s.clientMAC === 'FF:FF:FF:FF:FF:FF' ? '✱ BROADCAST' : s.clientMAC}
          </span>
          <span className="text-[9px] text-error font-bold">{s.packetsPerSec}</span>
          <span className="text-[9px] text-text-secondary">{fmtNum(s.totalSent)}</span>
          <div className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: s.status === 'running' ? 'var(--green)' : 'var(--text-secondary)' }}
            />
            <span
              className="text-[8px] font-bold"
              style={{ color: s.status === 'running' ? 'var(--green)' : 'var(--text-secondary)' }}
            >
              {s.status.toUpperCase()}
            </span>
          </div>
          <Badge label={s.reason.replace('_', ' ').toUpperCase()} color="var(--warning)" />
          <span className="text-[8px] text-text-secondary">{s.startedAt}</span>
        </div>
      ))}
    </Panel>
  );
}