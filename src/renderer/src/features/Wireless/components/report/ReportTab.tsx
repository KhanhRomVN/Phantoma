// ============================================================================
// ReportTab — Executive summary and vulnerability report
// ============================================================================

import type { WiFiNetwork, ActiveAttack } from '../../types';
import { encBadge } from '../../utils';
import { Panel } from '../shared/Panel';
import { Stat } from '../shared/Stat';
import { Tag } from '../shared/Tag';
import { Btn } from '../shared/Btn';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel title="Executive Summary" accent="var(--primary)">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Stat label="Networks Scanned" value={networks.length} accent="var(--primary)" />
          <Stat label="Vulnerable" value={vulns.length} accent="var(--error)" />
          <Stat label="Passwords Cracked" value={crackedCount} accent="var(--success)" />
          <Stat
            label="Risk Score"
            value={`${Math.min(100, Math.round((vulns.length / networks.length) * 100))}%`}
            accent="var(--warning)"
          />
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
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
              style={{
                padding: '8px 12px',
                background: 'var(--input-background)',
                border: '1px solid var(--border)',
                borderRadius: 5,
                marginBottom: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {n.ssid || '‹hidden›'}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{n.bssid}</span>
                {encBadge(n.encryption)}
                {n.crackedPassword && <Tag label={`PSK: ${n.crackedPassword}`} color="var(--success)" />}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {reasons.map((r, i) => (
                  <Tag key={i} label={r.label} color={r.color} />
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
            style={{
              display: 'flex',
              gap: 12,
              padding: '8px 0',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            <div
              style={{
                width: 5,
                flexShrink: 0,
                background: color as string,
                borderRadius: 2,
                alignSelf: 'stretch',
              }}
            />
            <div>
              <div
                style={{ fontSize: 10, fontWeight: 700, color: color as string, marginBottom: 3 }}
              >
                {title}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
          <Btn label="📄 EXPORT PDF REPORT" color="var(--primary)" size="sm" />
          <Btn label="📊 EXPORT JSON" color="var(--success)" size="sm" />
          <Btn label="📋 COPY SUMMARY" color="var(--text-secondary)" size="sm" />
        </div>
      </Panel>
    </div>
  );
}