// ============================================================================
// WPSAttackPanel — WPS vulnerability targeting
// ============================================================================

import type { WiFiNetwork } from '../../types';
import { Btn } from '../shared/Btn';
import { Tag } from '../shared/Tag';

interface WPSAttackPanelProps {
  networks: WiFiNetwork[];
  onAction: (action: string, net: WiFiNetwork) => void;
}

export function WPSAttackPanel({ networks, onAction }: WPSAttackPanelProps) {
  const wpsTargets = networks.filter((n) => n.wps);

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          fontSize: 8,
          color: 'var(--text-secondary)',
          fontWeight: 700,
          letterSpacing: '0.12em',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        WPS TARGETS ({wpsTargets.length})
        <Btn
          label="🔓 PIXIE DUST ALL VULNERABLE"
          color="var(--error)"
          size="xs"
          onClick={() =>
            wpsTargets.filter((n) => n.wpsVulnerable).forEach((n) => onAction('wps', n))
          }
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {wpsTargets.map((net) => (
          <div
            key={net.id}
            style={{
              background: 'var(--card-background)',
              border: `1px solid ${net.wpsVulnerable ? '#ef444430' : 'var(--border)'}`,
              borderRadius: 5,
              padding: '10px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {net.wpsVulnerable && (
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--error)',
                    boxShadow: '0 0 6px #ef4444',
                    flexShrink: 0,
                  }}
                />
              )}
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>{net.ssid}</span>
              <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>{net.bssid}</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 8,
                  fontWeight: 700,
                  color: net.wpsVulnerable ? 'var(--error)' : net.wpsLocked ? 'var(--text-secondary)' : 'var(--warning)',
                }}
              >
                {net.wpsVulnerable ? '⚡ VULNERABLE' : net.wpsLocked ? '🔒 LOCKED' : '● ACTIVE'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 9 }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                CH <span style={{ color: 'var(--text-secondary)' }}>{net.channel}</span>
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Signal <span style={{ color: 'var(--warning)' }}>{net.signal}dBm</span>
              </span>
              {net.wpsPin && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  PIN <span style={{ color: 'var(--success)', fontWeight: 700 }}>{net.wpsPin}</span>
                </span>
              )}
              {net.crackedPassword && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  PSK{' '}
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>{net.crackedPassword}</span>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {net.wpsVulnerable && !net.wpsPin && (
                <Btn
                  label="⚡ PIXIE DUST"
                  color="var(--error)"
                  onClick={() => onAction('wps', net)}
                  size="xs"
                />
              )}
              {!net.wpsLocked && (
                <Btn label="🔑 PIN BRUTEFORCE" color="var(--warning)" size="xs" onClick={() => {}} />
              )}
              {net.wpsPin && <Tag label={`✓ PIN: ${net.wpsPin}`} color="var(--success)" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}