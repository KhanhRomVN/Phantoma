// ============================================================================
// WPSAttackPanel — WPS vulnerability targeting
// ============================================================================

import type { WiFiNetwork } from '../../types';
import { Btn } from '../shared/Btn';

// Helper function to resolve color from CSS variable or hex
function resolveColor(color: string): string {
  const colorMap: Record<string, string> = {
    'var(--success)': '#10b981',
    'var(--error)': '#ef4444',
    'var(--warning)': '#f59e0b',
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

interface WPSAttackPanelProps {
  networks: WiFiNetwork[];
  onAction: (action: string, net: WiFiNetwork) => void;
}

export function WPSAttackPanel({ networks, onAction }: WPSAttackPanelProps) {
  const wpsTargets = networks.filter((n) => n.wps);

  return (
    <div className="mt-2.5">
      <div className="text-[8px] text-text-secondary font-bold tracking-[0.12em] mb-2 flex items-center gap-2">
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
      <div className="grid grid-cols-2 gap-2">
        {wpsTargets.map((net) => (
          <div
            key={net.id}
            className={`bg-card-background rounded p-2.5 border ${net.wpsVulnerable ? 'border-error/30' : 'border-border'}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {net.wpsVulnerable && (
                <div className="w-1.5 h-1.5 rounded-full bg-error shadow-[0_0_6px_#ef4444] flex-shrink-0" />
              )}
              <span className="text-[10px] font-bold text-text-primary">{net.ssid}</span>
              <span className="text-[8px] text-text-secondary">{net.bssid}</span>
              <span
                className="ml-auto text-[8px] font-bold"
                style={{ color: net.wpsVulnerable ? 'var(--error)' : net.wpsLocked ? 'var(--text-secondary)' : 'var(--yellow)' }}
              >
                {net.wpsVulnerable ? '⚡ VULNERABLE' : net.wpsLocked ? '🔒 LOCKED' : '● ACTIVE'}
              </span>
            </div>
            <div className="flex gap-2.5 mb-2 text-[9px]">
              <span className="text-text-secondary">
                CH <span className="text-text-secondary">{net.channel}</span>
              </span>
              <span className="text-text-secondary">
                Signal <span className="text-warning">{net.signal}dBm</span>
              </span>
              {net.wpsPin && (
                <span className="text-text-secondary">
                  PIN <span className="text-success font-bold">{net.wpsPin}</span>
                </span>
              )}
              {net.crackedPassword && (
                <span className="text-text-secondary">
                  PSK{' '}
                  <span className="text-success font-bold">{net.crackedPassword}</span>
                </span>
              )}
            </div>
            <div className="flex gap-1">
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
              {net.wpsPin && <Badge label={`✓ PIN: ${net.wpsPin}`} color="var(--success)" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}