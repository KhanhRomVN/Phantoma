// ============================================================================
// DeauthManager — Deauthentication attack manager
// ============================================================================

import { useState, useEffect } from 'react';
import type { WiFiNetwork, DeauthSession } from '../../types';
import { fmtNum } from '../../utils';
import { Panel } from '../shared/Panel';
import { Btn } from '../shared/Btn';
import { Tag } from '../shared/Tag';

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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 80px 110px 100px',
          gap: 8,
          marginBottom: 10,
          alignItems: 'flex-end',
        }}
      >
        <div>
          <div style={{ fontSize: 8, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 700 }}>TARGET BSSID</div>
          <select
            value={targetNet}
            onChange={(e) => setTargetNet(e.target.value)}
            style={selectStyle}
          >
            {networks.map((n) => (
              <option key={n.bssid} value={n.bssid}>
                {n.ssid || '‹hidden›'} ({n.bssid})
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 8, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 700 }}>CLIENT MAC</div>
          <input
            value={clientMac}
            onChange={(e) => setClientMac(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <div style={{ fontSize: 8, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 700 }}>PKT/SEC</div>
          <input
            type="number"
            value={pps}
            onChange={(e) => setPps(Number(e.target.value))}
            min={1}
            max={50}
            style={{ ...inputStyle, color: 'var(--warning)', fontWeight: 700, fontSize: 10 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 8, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 700 }}>REASON</div>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as typeof reason)}
            style={selectStyle}
          >
            <option value="handshake">Handshake Capture</option>
            <option value="evil_twin">Evil Twin Prep</option>
            <option value="test">Connectivity Test</option>
          </select>
        </div>
        <div style={{ paddingTop: 14 }}>
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '150px 130px 130px 60px 70px 70px 80px 60px',
          gap: 5,
          padding: '4px 0',
          borderBottom: '1px solid var(--border)',
          marginBottom: 6,
        }}
      >
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
            style={{ fontSize: 7, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.1em' }}
          >
            {h}
          </span>
        ))}
      </div>

      {localSessions.map((s) => (
        <div
          key={s.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '150px 130px 130px 60px 70px 70px 80px 60px',
            gap: 5,
            padding: '5px 0',
            borderBottom: '1px solid var(--divider)',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 9, color: 'var(--text-primary)', fontWeight: 600 }}>{s.targetSSID}</span>
          <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>{s.targetBSSID}</span>
          <span
            style={{
              fontSize: 8,
              color: s.clientMAC === 'FF:FF:FF:FF:FF:FF' ? 'var(--warning)' : 'var(--text-secondary)',
            }}
          >
            {s.clientMAC === 'FF:FF:FF:FF:FF:FF' ? '✱ BROADCAST' : s.clientMAC}
          </span>
          <span style={{ fontSize: 9, color: 'var(--error)', fontWeight: 700 }}>{s.packetsPerSec}</span>
          <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{fmtNum(s.totalSent)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: s.status === 'running' ? 'var(--success)' : 'var(--text-secondary)',
              }}
            />
            <span
              style={{
                fontSize: 8,
                color: s.status === 'running' ? 'var(--success)' : 'var(--text-secondary)',
                fontWeight: 700,
              }}
            >
              {s.status.toUpperCase()}
            </span>
          </div>
          <Tag label={s.reason.replace('_', ' ').toUpperCase()} color="var(--warning)" />
          <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>{s.startedAt}</span>
        </div>
      ))}
    </Panel>
  );
}