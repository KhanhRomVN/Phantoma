// ============================================================================
// ReportTab — Executive summary and vulnerability report
// ============================================================================

import type { WiFiNetwork, ActiveAttack } from '../../types';
import { encBadge } from '../../utils';
import { Panel } from '../shared/Panel';
import { Stat } from '../shared/Stat';
import { Btn } from '../shared/Btn';

// Helper function to resolve color from CSS variable
function resolveColor(color: string): string {
  const colorMap: Record<string, string> = {
    'var(--success)': '#10b981',
    'var(--error)': '#ef4444',
    'var(--warning)': '#f59e0b',
    'var(--primary)': '#3686ff',
    'var(--accent-purple)': '#a78bfa',
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

interface ReportTabProps {
  networks: WiFiNetwork[];
  attacks: ActiveAttack[];
  crackedCount: number;
}

export function ReportTab({ networks, attacks: _attacks, crackedCount }: ReportTabProps) {
  const vulns = networks.filter(
    (n) =>
      n.wpsVulnerable ||
      n.encryption === 'wep' ||
      n.encryption === 'open' ||
      n.crackProbability >= 70,
  );

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Executive Summary" accent="var(--primary)">
        <div className="grid grid-cols-4 gap-2 mb-3">
          <Stat label="Networks Scanned" value={networks.length} accent="var(--primary)" />
          <Stat label="Vulnerable" value={vulns.length} accent="var(--error)" />
          <Stat label="Passwords Cracked" value={crackedCount} accent="var(--success)" />
          <Stat
            label="Risk Score"
            value={`${Math.min(100, Math.round((vulns.length / networks.length) * 100))}%`}
            accent="var(--warning)"
          />
        </div>
        <div className="text-[9px] text-text-secondary leading-relaxed">
          Wireless security audit completed. {vulns.length} out of {networks.length} networks
          present critical or high-severity vulnerabilities.
          {networks.filter((n) => n.encryption === 'wep').length > 0 &&
            ` ${networks.filter((n) => n.encryption === 'wep').length} network(s) use deprecated WEP encryption.`}
          {networks.filter((n) => n.encryption === 'open').length > 0 &&
            ` ${networks.filter((n) => n.encryption === 'open').length} network(s) are completely open (no encryption).`}
          {networks.filter((n) => n.wpsVulnerable).length > 0 &&
            ` ${networks.filter((n) => n.wpsVulnerable).length} access point(s) are vulnerable to WPS Pixie Dust attacks.`}
        </div>
      </Panel>

      <Panel title="Vulnerability Findings" accent="var(--error)">
        {vulns.map((n) => {
          const reasons: { label: string; color: string }[] = [];
          if (n.encryption === 'open')
            reasons.push({ label: 'CRITICAL: No encryption', color: 'var(--error)' });
          if (n.encryption === 'wep')
            reasons.push({ label: 'CRITICAL: WEP (deprecated)', color: 'var(--error)' });
          if (n.wpsVulnerable) reasons.push({ label: 'HIGH: WPS Pixie Dust', color: 'var(--warning)' });
          if (!n.mfpEnabled) reasons.push({ label: 'MEDIUM: MFP disabled', color: 'var(--warning)' });
          if (n.crackProbability >= 70 && !reasons.length)
            reasons.push({ label: 'HIGH: Weak password', color: 'var(--warning)' });

          return (
            <div
              key={n.id}
              className="py-2 px-3 bg-input-background border border-border rounded mb-1.5"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-xs font-bold text-text-primary">
                  {n.ssid || '‹hidden›'}
                </span>
                <span className="text-[9px] text-text-secondary">{n.bssid}</span>
                {encBadge(n.encryption)}
                {n.crackedPassword && <Badge label={`PSK: ${n.crackedPassword}`} color="var(--success)" />}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {reasons.map((r, i) => (
                  <Badge key={i} label={r.label} color={r.color} />
                ))}
              </div>
            </div>
          );
        })}
      </Panel>

      <Panel title="Recommendations" accent="var(--success)">
        {[
          [
            'Disable WEP',
            'Replace all WEP-encrypted networks with WPA2 or WPA3. WEP is cryptographically broken.',
            'var(--error)',
          ],
          [
            'Disable WPS',
            'Turn off WPS on all routers. WPS is vulnerable to Pixie Dust and brute-force attacks.',
            'var(--warning)',
          ],
          [
            'Enable WPA3 / SAE',
            'Migrate to WPA3 where hardware supports. Enables forward secrecy and dragonfly handshake.',
            'var(--success)',
          ],
          [
            'Enable MFP (802.11w)',
            'Mandatory Management Frame Protection prevents deauthentication attacks.',
            'var(--warning)',
          ],
          [
            'Use Strong Passphrases',
            'Wi-Fi passwords should be 20+ characters, avoiding dictionary words.',
            'var(--primary)',
          ],
          [
            'Deploy RADIUS / 802.1X',
            'Enterprise networks should use per-user certificates instead of shared PSK.',
            'var(--accent-purple)',
          ],
        ].map(([title, desc, color]) => (
          <div
            key={title}
            className="flex gap-3 py-2 border-b border-divider"
          >
            <div
              className="w-[5px] flex-shrink-0 rounded-sm self-stretch"
              style={{ background: color as string }}
            />
            <div>
              <div
                className="text-[10px] font-bold mb-0.5"
                style={{ color: color as string }}
              >
                {title}
              </div>
              <div className="text-[9px] text-text-secondary leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
        <div className="mt-3 flex gap-1.5">
          <Btn label="📄 EXPORT PDF REPORT" color="var(--primary)" size="sm" />
          <Btn label="📊 EXPORT JSON" color="var(--success)" size="sm" />
          <Btn label="📋 COPY SUMMARY" color="var(--text-secondary)" size="sm" />
        </div>
      </Panel>
    </div>
  );
}