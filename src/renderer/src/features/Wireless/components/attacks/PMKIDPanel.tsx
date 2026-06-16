// ============================================================================
// PMKIDPanel — PMKID attack interface (no deauth required)
// ============================================================================

import type { WiFiNetwork } from '../../types';
import { Panel } from '../shared/Panel';
import { Btn } from '../shared/Btn';

// Helper function to resolve color from CSS variable
function resolveColor(color: string): string {
  const colorMap: Record<string, string> = {
    'var(--accent-purple)': '#a78bfa',
    'var(--success)': '#10b981',
  };
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

interface PMKIDPanelProps {
  networks: WiFiNetwork[];
  onAction: (action: string, net: WiFiNetwork) => void;
}

export function PMKIDPanel({ networks, onAction }: PMKIDPanelProps) {
  const wpa2Targets = networks.filter((n) => n.encryption === 'wpa2' || n.encryption === 'wpa');

  return (
    <Panel title="PMKID Attack · hcxdumptool — No Deauth Required" accent="var(--accent-purple)">
      <div className="text-[9px] text-text-secondary mb-3 leading-relaxed py-2 px-2.5 bg-accent-purple/5 border border-accent-purple/20 rounded">
        PMKID attacks capture the RSN IE PMKID from beacon/association frames — no client needed, no
        deauth sent. Use <span className="text-accent-purple">hcxdumptool</span> to capture, then
        crack with <span className="text-accent-purple">hashcat -m 22000</span>.
      </div>
      <div className="grid grid-cols-2 gap-2">
        {wpa2Targets.map((net) => (
          <div
            key={net.id}
            className={`p-2 bg-input-background rounded border ${net.pmkidCaptured ? 'border-accent-purple/40' : 'border-border'}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold text-text-primary">
                {net.ssid || '‹hidden›'}
              </span>
              {net.pmkidCaptured && <Badge label="✓ CAPTURED" color="var(--accent-purple)" />}
              {net.crackedPassword && <Badge label="CRACKED" color="var(--success)" />}
            </div>
            <div className="flex gap-2.5 text-[9px] mb-1.5">
              <span className="text-text-secondary">
                BSSID <span className="text-text-secondary">{net.bssid}</span>
              </span>
              <span className="text-text-secondary">
                CH <span className="text-text-secondary">{net.channel}</span>
              </span>
              <span className="text-text-secondary">{net.signal}dBm</span>
            </div>
            {net.pmkidFile && (
              <div className="text-[8px] text-accent-purple mb-1.5">
                → {net.pmkidFile}
              </div>
            )}
            {net.crackedPassword && (
              <div className="text-[9px] text-success font-bold mb-1.5">
                ✓ {net.crackedPassword}
              </div>
            )}
            <div className="flex gap-1">
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
                <Badge label="✓ PASSWORD RECOVERED" color="var(--success)" />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2.5">
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