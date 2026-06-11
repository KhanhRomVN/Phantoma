// ============================================================================
// PMKIDPanel — PMKID attack interface (no deauth required)
// ============================================================================

import type { WiFiNetwork } from '../../types';
import { Panel } from '../shared/Panel';
import { Btn } from '../shared/Btn';
import { Tag } from '../shared/Tag';

interface PMKIDPanelProps {
  networks: WiFiNetwork[];
  onAction: (action: string, net: WiFiNetwork) => void;
}

export function PMKIDPanel({ networks, onAction }: PMKIDPanelProps) {
  const wpa2Targets = networks.filter((n) => n.encryption === 'wpa2' || n.encryption === 'wpa');

  return (
    <Panel title="PMKID Attack · hcxdumptool — No Deauth Required" accent="var(--accent-purple)">
      <div
        style={{
          fontSize: 9,
          color: 'var(--text-secondary)',
          marginBottom: 12,
          lineHeight: 1.7,
          padding: '8px 10px',
          background: '#a78bfa08',
          border: '1px solid #a78bfa20',
          borderRadius: 4,
        }}
      >
        PMKID attacks capture the RSN IE PMKID from beacon/association frames — no client needed, no
        deauth sent. Use <span style={{ color: 'var(--accent-purple)' }}>hcxdumptool</span> to capture, then
        crack with <span style={{ color: 'var(--accent-purple)' }}>hashcat -m 22000</span>.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {wpa2Targets.map((net) => (
          <div
            key={net.id}
            style={{
              padding: '8px 10px',
              background: 'var(--input-background)',
              border: `1px solid ${net.pmkidCaptured ? '#a78bfa40' : 'var(--border)'}`,
              borderRadius: 5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>
                {net.ssid || '‹hidden›'}
              </span>
              {net.pmkidCaptured && <Tag label="✓ CAPTURED" color="var(--accent-purple)" />}
              {net.crackedPassword && <Tag label="CRACKED" color="var(--success)" />}
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 9, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                BSSID <span style={{ color: 'var(--text-secondary)' }}>{net.bssid}</span>
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                CH <span style={{ color: 'var(--text-secondary)' }}>{net.channel}</span>
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{net.signal}dBm</span>
            </div>
            {net.pmkidFile && (
              <div style={{ fontSize: 8, color: 'var(--accent-purple)', marginBottom: 5 }}>
                → {net.pmkidFile}
              </div>
            )}
            {net.crackedPassword && (
              <div style={{ fontSize: 9, color: 'var(--success)', fontWeight: 700, marginBottom: 5 }}>
                ✓ {net.crackedPassword}
              </div>
            )}
            <div style={{ display: 'flex', gap: 4 }}>
              {!net.pmkidCaptured ? (
                <Btn
                  label="🧬 CAPTURE PMKID"
                  color="var(--accent-purple)"
                  onClick={() => onAction('pmkid', net)}
                  size="xs"
                />
              ) : !net.crackedPassword ? (
                <Btn
                  label="🔓 CRACK (hashcat)"
                  color="var(--warning)"
                  onClick={() => onAction('crack', net)}
                  size="xs"
                />
              ) : (
                <Tag label="✓ PASSWORD RECOVERED" color="var(--success)" />
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <Btn
          label="🧬 CAPTURE ALL PMKID"
          color="var(--accent-purple)"
          size="sm"
          onClick={() => wpa2Targets.forEach((n) => onAction('pmkid', n))}
        />
        <Btn label="⚙ hcxdumptool CONFIG" color="var(--text-secondary)" size="sm" />
        <Btn label="📊 EXPORT .hc22000" color="var(--text-secondary)" size="sm" />
      </div>
    </Panel>
  );
}