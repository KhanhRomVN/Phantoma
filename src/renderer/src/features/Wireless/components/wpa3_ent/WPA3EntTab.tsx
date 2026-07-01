// ============================================================================
// WPA3EntTab — WPA3, Enterprise, and KRACK assessment
// ============================================================================

import type { WPA3Result, EnterpriseCapture, KrackResult } from '../../types';
import { Panel } from '../shared/Panel';
import { Btn } from '../shared/Btn';
import { $ } from '@renderer/utils/color';

// Helper function to resolve color from CSS variable or hex
function resolveColor(color: string): string {
  const colorMap: Record<string, string> = {
    '--error': '#ef4444',
    '--warning': '#f59e0b',
    '--success': '#10b981',
    '--primary': '#3686ff',
    '--text-secondary': '#9ca3af',
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

interface WPA3EntTabProps {
  wpa3Results: WPA3Result[];
  entCaptures: EnterpriseCapture[];
  krackResults: KrackResult[];
}

export function WPA3EntTab({ wpa3Results, entCaptures, krackResults }: WPA3EntTabProps) {
  return (
    <div className="flex flex-col gap-3">
      <Panel title="WPA3 Security Assessment" accent={$('--accent-purple') || '#a78bfa'}>
        {wpa3Results.length === 0 ? (
          <div className="text-[9px] text-text-secondary py-5 text-center">
            No WPA3 targets scanned.
          </div>
        ) : (
          wpa3Results.map((r) => (
            <div
              key={r.bssid}
              className="bg-input-background border border-border rounded p-3 mb-2"
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="text-xs font-bold text-text-primary">{r.ssid}</span>
                <span className="text-[9px] text-text-secondary">{r.bssid}</span>
                {r.vulnerableToDowngrade && (
                  <Badge label="⚠ DOWNGRADE VULN" color={$('--error') || '#ef4444'} />
                )}
                {r.transitionMode && (
                  <Badge label="TRANSITION MODE" color={$('--warning') || '#f59e0b'} />
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2.5">
                {[
                  ['WPA3 Support', r.wpa3Supported, $('--success')],
                  ['Transition Mode', r.transitionMode, $('--error')],
                  ['MFP Enabled', r.mfpEnabled, $('--success')],
                  ['Downgrade Vuln', r.vulnerableToDowngrade, $('--error')],
                ].map(([k, v, c]) => (
                  <div
                    key={k as string}
                    className="py-1.5 px-2.5 bg-card-background rounded border border-border"
                  >
                    <div className="text-[8px] text-text-secondary mb-0.5">{k as string}</div>
                    <div
                      className="text-[10px] font-bold"
                      style={{ color: v ? (c as string) : $('--text-secondary') }}
                    >
                      {v ? '✓ Yes' : '✗ No'}
                    </div>
                  </div>
                ))}
              </div>
              {r.notes.map((n, i) => (
                <div
                  key={i}
                  className="text-[9px] text-warning py-0.5 px-2 bg-warning/5 rounded mb-0.5"
                >
                  ⚠ {n}
                </div>
              ))}
            </div>
          ))
        )}
      </Panel>

      <Panel
        title="WPA-Enterprise · RADIUS Credential Capture"
        accent={$('--warning') || '#f59e0b'}
      >
        {entCaptures.length === 0 ? (
          <div className="text-[9px] text-text-secondary py-5 text-center">
            No enterprise credentials captured. Deploy rogue AP via EVIL action.
          </div>
        ) : (
          entCaptures.map((ec) => (
            <div key={ec.id} className="bg-input-background border border-border rounded p-3 mb-2">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-xs font-bold text-warning">
                  {ec.domain ? `${ec.domain}\\${ec.username}` : ec.username}
                </span>
                <Badge label={ec.eapMethod} color={$('--warning') || '#f59e0b'} />
                <span className="text-[9px] text-text-secondary ml-auto">{ec.timestamp}</span>
              </div>
              <div className="text-[9px]">
                <span className="text-text-secondary">MSCHAPv2 Hash: </span>
                <span className="text-warning font-mono break-all">{ec.mschapv2Hash}</span>
              </div>
              {ec.crackedPassword ? (
                <div className="mt-2 text-[10px] text-success font-bold">
                  ✓ Password: {ec.crackedPassword}
                </div>
              ) : (
                <div className="mt-2 flex gap-1">
                  <Btn label="🔓 Crack with asleap" color={$('--warning') || '#f59e0b'} size="xs" />
                  <Btn label="🔓 Hashcat -m 5500" color={$('--error') || '#ef4444'} size="xs" />
                </div>
              )}
            </div>
          ))
        )}
      </Panel>

      <Panel
        title="KRACK Attack · Key Reinstallation (CVE-2017-13077+)"
        accent={$('--error') || '#ef4444'}
      >
        {krackResults.length === 0 ? (
          <div className="text-[9px] text-text-secondary py-5 text-center">
            No KRACK tests run. Select an enterprise or WPA2 network and expand.
          </div>
        ) : (
          krackResults.map((kr) => (
            <div key={kr.id} className="bg-input-background border border-border rounded p-3 mb-2">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-xs font-bold text-text-primary">{kr.targetSSID}</span>
                <span className="text-[9px] text-text-secondary">{kr.targetBSSID}</span>
                {kr.vulnerable ? (
                  <Badge label="💀 VULNERABLE" color={$('--error') || '#ef4444'} />
                ) : (
                  <Badge label="✓ PATCHED" color={$('--success') || '#10b981'} />
                )}
                <span className="text-[9px] text-text-secondary ml-auto">{kr.testedAt}</span>
              </div>
              <div className="text-[9px] mb-1.5">
                <span className="text-text-secondary">Client MAC: </span>
                <span className="text-text-secondary">{kr.clientMac}</span>
              </div>
              <div className="flex gap-1 flex-wrap mb-2">
                {kr.cveList.map((cve) => (
                  <Badge key={cve} label={cve} color={$('--error') || '#ef4444'} />
                ))}
              </div>
              <div className="text-[9px] text-warning py-1.5 px-2 bg-warning/5 rounded">
                Impact: {kr.impact}
              </div>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}
