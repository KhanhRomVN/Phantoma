// ============================================================================
// WPA3EntTab — WPA3, Enterprise, and KRACK assessment
// ============================================================================

import type { WPA3Result, EnterpriseCapture, KrackResult } from '../../types';
import { Panel } from '../shared/Panel';
import { Tag } from '../shared/Tag';
import { Btn } from '../shared/Btn';

interface WPA3EntTabProps {
  wpa3Results: WPA3Result[];
  entCaptures: EnterpriseCapture[];
  krackResults: KrackResult[];
}

export function WPA3EntTab({ wpa3Results, entCaptures, krackResults }: WPA3EntTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel title="WPA3 Security Assessment" accent="var(--accent-purple)">
        {wpa3Results.length === 0 ? (
          <div style={{ fontSize: 9, color: 'var(--text-secondary)', padding: 20, textAlign: 'center' }}>
            No WPA3 targets scanned.
          </div>
        ) : (
          wpa3Results.map((r) => (
            <div
              key={r.bssid}
              style={{
                background: 'var(--input-background)',
                border: '1px solid var(--border)',
                borderRadius: 5,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{r.ssid}</span>
                <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{r.bssid}</span>
                {r.vulnerableToDowngrade && <Tag label="⚠ DOWNGRADE VULN" color="var(--error)" />}
                {r.transitionMode && <Tag label="TRANSITION MODE" color="var(--warning)" />}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                {[
                  ['WPA3 Support', r.wpa3Supported, 'var(--success)'],
                  ['Transition Mode', r.transitionMode, 'var(--error)'],
                  ['MFP Enabled', r.mfpEnabled, 'var(--success)'],
                  ['Downgrade Vuln', r.vulnerableToDowngrade, 'var(--error)'],
                ].map(([k, v, c]) => (
                  <div
                    key={k as string}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--card-background)',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: 8, color: 'var(--text-secondary)', marginBottom: 3 }}>
                      {k as string}
                    </div>
                    <div
                      style={{ fontSize: 10, fontWeight: 700, color: v ? (c as string) : 'var(--text-secondary)' }}
                    >
                      {v ? '✓ Yes' : '✗ No'}
                    </div>
                  </div>
                ))}
              </div>
              {r.notes.map((n, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 9,
                    color: 'var(--warning)',
                    padding: '3px 8px',
                    background: '#f9731608',
                    borderRadius: 3,
                    marginBottom: 3,
                  }}
                >
                  ⚠ {n}
                </div>
              ))}
            </div>
          ))
        )}
      </Panel>

      <Panel title="WPA-Enterprise · RADIUS Credential Capture" accent="var(--warning)">
        {entCaptures.length === 0 ? (
          <div style={{ fontSize: 9, color: 'var(--text-secondary)', padding: 20, textAlign: 'center' }}>
            No enterprise credentials captured. Deploy rogue AP via EVIL action.
          </div>
        ) : (
          entCaptures.map((ec) => (
            <div
              key={ec.id}
              style={{
                background: 'var(--input-background)',
                border: '1px solid var(--border)',
                borderRadius: 5,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)' }}>
                  {ec.domain ? `${ec.domain}\\${ec.username}` : ec.username}
                </span>
                <Tag label={ec.eapMethod} color="var(--warning)" />
                <span style={{ fontSize: 9, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                  {ec.timestamp}
                </span>
              </div>
              <div style={{ fontSize: 9 }}>
                <span style={{ color: 'var(--text-secondary)' }}>MSCHAPv2 Hash: </span>
                <span style={{ color: 'var(--warning)', fontFamily: 'inherit', wordBreak: 'break-all' }}>
                  {ec.mschapv2Hash}
                </span>
              </div>
              {ec.crackedPassword ? (
                <div style={{ marginTop: 8, fontSize: 10, color: 'var(--success)', fontWeight: 700 }}>
                  ✓ Password: {ec.crackedPassword}
                </div>
              ) : (
                <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                  <Btn label="🔓 Crack with asleap" color="var(--warning)" size="xs" />
                  <Btn label="🔓 Hashcat -m 5500" color="var(--error)" size="xs" />
                </div>
              )}
            </div>
          ))
        )}
      </Panel>

      <Panel title="KRACK Attack · Key Reinstallation (CVE-2017-13077+)" accent="var(--error)">
        {krackResults.length === 0 ? (
          <div style={{ fontSize: 9, color: 'var(--text-secondary)', padding: 20, textAlign: 'center' }}>
            No KRACK tests run. Select an enterprise or WPA2 network and expand.
          </div>
        ) : (
          krackResults.map((kr) => (
            <div
              key={kr.id}
              style={{
                background: 'var(--input-background)',
                border: '1px solid var(--border)',
                borderRadius: 5,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {kr.targetSSID}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{kr.targetBSSID}</span>
                {kr.vulnerable ? (
                  <Tag label="💀 VULNERABLE" color="var(--error)" />
                ) : (
                  <Tag label="✓ PATCHED" color="var(--success)" />
                )}
                <span style={{ fontSize: 9, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                  {kr.testedAt}
                </span>
              </div>
              <div style={{ fontSize: 9, marginBottom: 5 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Client MAC: </span>
                <span style={{ color: 'var(--text-secondary)' }}>{kr.clientMac}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {kr.cveList.map((cve) => (
                  <Tag key={cve} label={cve} color="var(--error)" />
                ))}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--warning)',
                  padding: '5px 8px',
                  background: '#f9731608',
                  borderRadius: 3,
                }}
              >
                Impact: {kr.impact}
              </div>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}