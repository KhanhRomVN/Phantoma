// ============================================================================
// ScanTab — WiFi network scanner and results table
// ============================================================================

import { useState } from 'react';
import type { WiFiNetwork, Encryption, ScanConfig } from '../../types';
import { ENC_PALETTE } from '../../constants';
import { signalBar, progressBar, encBadge } from '../../utils';
import { Btn } from '../shared/Btn';
import { Tag } from '../shared/Tag';
import { ClientBadge } from '../shared/ClientBadge';
import { fmtNum } from '../../utils';

interface ScanTabProps {
  networks: WiFiNetwork[];
  onAction: (action: string, net: WiFiNetwork) => void;
  isScanning: boolean;
  onScan: () => void;
  scanConfig: ScanConfig;
  onScanConfig: (c: ScanConfig) => void;
  expandedRow: string | null;
  setExpandedRow: (id: string | null) => void;
}

const ACCENT = 'var(--primary)';

export function ScanTab({
  networks,
  onAction,
  isScanning,
  onScan,
  scanConfig,
  onScanConfig,
  expandedRow,
  setExpandedRow,
}: ScanTabProps) {
  const [sortKey, setSortKey] = useState<'signal' | 'ssid' | 'encryption' | 'crackProbability'>(
    'signal',
  );
  const [filterEnc, setFilterEnc] = useState<string>('all');
  const [filterVuln, setFilterVuln] = useState(false);

  const sorted = [...networks]
    .filter((n) => filterEnc === 'all' || n.encryption === filterEnc)
    .filter(
      (n) => !filterVuln || n.wpsVulnerable || n.crackProbability >= 70 || n.encryption === 'wep',
    )
    .sort((a, b) => {
      if (sortKey === 'signal') return b.signal - a.signal;
      if (sortKey === 'ssid') return a.ssid.localeCompare(b.ssid);
      if (sortKey === 'crackProbability') return b.crackProbability - a.crackProbability;
      return a.encryption.localeCompare(b.encryption);
    });

  const selectStyle: React.CSSProperties = {
    background: 'var(--input-background)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: 9,
    padding: '3px 6px',
    borderRadius: 4,
    fontFamily: 'inherit',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Scan Config Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--card-background)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.1em' }}>
          INTERFACE
        </span>
        <select
          value={scanConfig.interface}
          onChange={(e) => onScanConfig({ ...scanConfig, interface: e.target.value })}
          style={selectStyle}
        >
          {['wlan0mon', 'wlan1mon', 'wlan2mon'].map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
        <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 700 }}>BAND</span>
        <select
          value={scanConfig.band}
          onChange={(e) =>
            onScanConfig({ ...scanConfig, band: e.target.value as ScanConfig['band'] })
          }
          style={selectStyle}
        >
          {['all', '2.4', '5', '6'].map((b) => (
            <option key={b} value={b}>
              {b === 'all' ? 'All Bands' : `${b} GHz`}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 700 }}>CHANNEL</span>
        <select
          value={scanConfig.channel}
          onChange={(e) =>
            onScanConfig({
              ...scanConfig,
              channel: e.target.value === 'all' ? 'all' : parseInt(e.target.value),
            })
          }
          style={selectStyle}
        >
          <option value="all">Hop All</option>
          {Array.from({ length: 14 }, (_, i) => i + 1).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          {[
            36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140,
            149, 153, 157, 161, 165,
          ].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={scanConfig.saveCapture}
            onChange={(e) => onScanConfig({ ...scanConfig, saveCapture: e.target.checked })}
            style={{ accentColor: ACCENT, width: 11, height: 11 }}
          />
          <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Save .cap</span>
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Btn
            label={isScanning ? '⟳ SCANNING...' : '⟳ START SCAN'}
            color={ACCENT}
            onClick={onScan}
            disabled={isScanning}
            size="sm"
          />
          <Btn label="⊞ ENABLE MONITOR" color="var(--success)" onClick={() => {}} size="sm" />
        </div>
      </div>

      {/* Filter Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 700 }}>FILTER:</span>
        {['all', 'open', 'wep', 'wpa', 'wpa2', 'wpa3', 'enterprise'].map((e) => (
          <button
            key={e}
            onClick={() => setFilterEnc(e)}
            style={{
              fontSize: 8,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.08em',
              border:
                filterEnc === e
                  ? `1px solid ${e === 'all' ? ACCENT : (ENC_PALETTE[e as Encryption]?.color ?? ACCENT)}50`
                  : '1px solid var(--border)',
              background:
                filterEnc === e
                  ? `${e === 'all' ? ACCENT : (ENC_PALETTE[e as Encryption]?.color ?? ACCENT)}15`
                  : 'transparent',
              color:
                filterEnc === e
                  ? e === 'all'
                    ? ACCENT
                    : (ENC_PALETTE[e as Encryption]?.color ?? ACCENT)
                  : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {e.toUpperCase()}
          </button>
        ))}
        <label
          style={{
            marginLeft: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={filterVuln}
            onChange={(e) => setFilterVuln(e.target.checked)}
            style={{ accentColor: 'var(--error)', width: 11, height: 11 }}
          />
          <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Vulnerable only</span>
        </label>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-secondary)' }}>
          {sorted.length}/{networks.length} networks
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>SORT:</span>
        {(['signal', 'ssid', 'encryption', 'crackProbability'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setSortKey(k)}
            style={{
              fontSize: 8,
              padding: '3px 7px',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'inherit',
              border: `1px solid ${sortKey === k ? `${ACCENT}40` : 'var(--border)'}`,
              background: sortKey === k ? `${ACCENT}15` : 'transparent',
              color: sortKey === k ? ACCENT : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {k === 'crackProbability' ? 'CRACK%' : k.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr 60px 80px 70px 70px 80px 100px 140px',
          gap: 6,
          padding: '6px 10px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {[
          'SIGNAL',
          'SSID / BSSID',
          'CH',
          'BAND',
          'ENC',
          'WPS',
          'CLIENTS',
          'CRACK %',
          'ACTIONS',
        ].map((h) => (
          <span
            key={h}
            style={{ fontSize: 8, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.1em' }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Network Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sorted.map((net) => {
          const exp = expandedRow === net.id;
          return (
            <div
              key={net.id}
              style={{
                background: exp ? 'var(--input-background)' : 'transparent',
                border: exp ? '1px solid var(--border)' : '1px solid transparent',
                borderRadius: 5,
                transition: 'all 0.15s',
              }}
            >
              <div
                onClick={() => setExpandedRow(exp ? null : net.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 60px 80px 70px 70px 80px 100px 140px',
                  gap: 6,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  alignItems: 'center',
                }}
              >
                {/* Signal */}
                <div>{signalBar(net.signal)}</div>

                {/* SSID/BSSID */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {net.hidden && <Tag label="HIDDEN" color="var(--text-secondary)" />}
                    {net.crackedPassword && <Tag label="CRACKED" color="var(--success)" />}
                    {net.handshakeCaptured && <Tag label="HS" color={ACCENT} />}
                    {net.pmkidCaptured && <Tag label="PMKID" color="var(--accent-purple)" />}
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {net.hidden ? '‹hidden›' : net.ssid}
                    </span>
                  </div>
                  <div style={{ fontSize: 8, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {net.bssid} · {net.vendor}
                  </div>
                  {net.crackedPassword && (
                    <div style={{ fontSize: 8, color: 'var(--success)', marginTop: 2 }}>
                      → {net.crackedPassword}
                    </div>
                  )}
                </div>

                {/* Channel */}
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>CH {net.channel}</div>

                {/* Band */}
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{net.band}</div>

                {/* Encryption */}
                <div>{encBadge(net.encryption)}</div>

                {/* WPS */}
                <div>
                  {net.wps ? (
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 3,
                        color: net.wpsVulnerable
                          ? 'var(--error)'
                          : net.wpsLocked
                            ? 'var(--text-secondary)'
                            : 'var(--warning)',
                        background: net.wpsVulnerable ? '#ef444410' : 'var(--border)',
                        border: `1px solid ${net.wpsVulnerable ? '#ef444430' : 'var(--border)'}`,
                      }}
                    >
                      {net.wpsVulnerable ? '⚡ VULN' : net.wpsLocked ? '🔒 LOCK' : '✓ OK'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>—</span>
                  )}
                </div>

                {/* Clients */}
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{net.clients.length} clients</div>

                {/* Crack % */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span
                    style={{
                      fontSize: 9,
                      color:
                        net.crackProbability >= 80
                          ? 'var(--success)'
                          : net.crackProbability >= 50
                            ? 'var(--warning)'
                            : 'var(--text-secondary)',
                      fontWeight: 700,
                      width: 26,
                    }}
                  >
                    {net.crackProbability}%
                  </span>
                  {progressBar(
                    net.crackProbability,
                    net.crackProbability >= 80
                      ? 'var(--success)'
                      : net.crackProbability >= 50
                        ? 'var(--warning)'
                        : 'var(--text-secondary)',
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {net.encryption !== 'open' && net.encryption !== 'wpa3' && (
                    <Btn
                      label={net.handshakeCaptured ? '✓ HS' : 'CAPTURE'}
                      color={ACCENT}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction('capture', net);
                      }}
                      disabled={net.handshakeCaptured}
                      size="xs"
                    />
                  )}
                  {!net.pmkidCaptured && net.encryption === 'wpa2' && (
                    <Btn
                      label="PMKID"
                      color="var(--accent-purple)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction('pmkid', net);
                      }}
                      size="xs"
                    />
                  )}
                  {net.wps && net.wpsVulnerable && (
                    <Btn
                      label="PIXIE"
                      color="var(--error)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction('wps', net);
                      }}
                      size="xs"
                    />
                  )}
                  {(net.handshakeCaptured || net.pmkidCaptured) && !net.crackedPassword && (
                    <Btn
                      label="CRACK"
                      color="var(--warning)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction('crack', net);
                      }}
                      size="xs"
                    />
                  )}
                  {net.encryption === 'wep' && (
                    <Btn
                      label="WEP"
                      color="var(--error)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction('wep', net);
                      }}
                      size="xs"
                    />
                  )}
                  <Btn
                    label="EVIL"
                    color="var(--accent-purple)"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction('evil', net);
                    }}
                    size="xs"
                  />
                </div>
              </div>

              {/* Expanded Row Details */}
              {exp && (
                <div
                  style={{
                    padding: '0 10px 12px 10px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 10,
                  }}
                >
                  {/* Network Info */}
                  <div>
                    <div
                      style={{
                        fontSize: 8,
                        color: 'var(--text-secondary)',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        marginBottom: 6,
                      }}
                    >
                      NETWORK INFO
                    </div>
                    {[
                      ['BSSID', net.bssid],
                      ['Vendor', net.vendor],
                      ['Channel', `${net.channel} (${net.band})`],
                      ['Signal / Noise', `${net.signal} / ${net.noise} dBm`],
                      ['Quality', `${net.quality}%`],
                      ['MFP', net.mfpEnabled ? '✓ Enabled' : '✗ Disabled'],
                      ['Transition Mode', net.transitionMode ? '⚠ Yes' : 'No'],
                      ['First Seen', net.firstSeen],
                      ['Last Seen', net.lastSeen],
                      ['Beacons', fmtNum(net.beaconCount)],
                    ].map(([k, v]) => (
                      <div
                        key={k as string}
                        style={{ display: 'flex', gap: 6, fontSize: 9, marginBottom: 3 }}
                      >
                        <span style={{ color: 'var(--text-secondary)', width: 95, flexShrink: 0 }}>{k}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
                      </div>
                    ))}
                    {net.wpsPin && (
                      <div style={{ display: 'flex', gap: 6, fontSize: 9, marginBottom: 3 }}>
                        <span style={{ color: 'var(--text-secondary)', width: 95 }}>WPS PIN</span>
                        <span style={{ color: 'var(--error)', fontWeight: 700 }}>{net.wpsPin}</span>
                      </div>
                    )}
                    {net.eapType && (
                      <div style={{ display: 'flex', gap: 6, fontSize: 9 }}>
                        <span style={{ color: 'var(--text-secondary)', width: 95 }}>EAP Type</span>
                        <span style={{ color: 'var(--warning)' }}>{net.eapType}</span>
                      </div>
                    )}
                  </div>

                  {/* Clients */}
                  <div>
                    <div
                      style={{
                        fontSize: 8,
                        color: 'var(--text-secondary)',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        marginBottom: 6,
                      }}
                    >
                      CLIENTS ({net.clients.length})
                    </div>
                    {net.clients.length === 0 ? (
                      <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>No clients detected</div>
                    ) : (
                      net.clients.map((c) => <ClientBadge key={c.mac} client={c} />)
                    )}
                  </div>

                  {/* Capture Status */}
                  <div>
                    <div
                      style={{
                        fontSize: 8,
                        color: 'var(--text-secondary)',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        marginBottom: 6,
                      }}
                    >
                      CAPTURE STATUS
                    </div>
                    {[
                      [
                        'Handshake',
                        net.handshakeCaptured ? `✓ ${net.handshakeFile}` : '✗ Not captured',
                        net.handshakeCaptured ? 'var(--success)' : 'var(--text-secondary)',
                      ],
                      [
                        'PMKID',
                        net.pmkidCaptured ? `✓ ${net.pmkidFile}` : '✗ Not captured',
                        net.pmkidCaptured ? 'var(--accent-purple)' : 'var(--text-secondary)',
                      ],
                      [
                        'Password',
                        net.crackedPassword ?? '—',
                        net.crackedPassword ? 'var(--success)' : 'var(--text-secondary)',
                      ],
                    ].map(([k, v, c]) => (
                      <div
                        key={k as string}
                        style={{ display: 'flex', gap: 6, fontSize: 9, marginBottom: 4 }}
                      >
                        <span style={{ color: 'var(--text-secondary)', width: 75, flexShrink: 0 }}>{k}</span>
                        <span style={{ color: c as string, fontWeight: 700 }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Btn
                        label="🎯 Deauth Clients"
                        color="var(--error)"
                        onClick={() => onAction('deauth', net)}
                        size="xs"
                      />
                      {net.encryption === 'enterprise' && (
                        <Btn
                          label="🏢 Rogue RADIUS"
                          color="var(--warning)"
                          onClick={() => onAction('enterprise', net)}
                          size="xs"
                        />
                      )}
                      {net.krackVulnerable && (
                        <Btn
                          label="💀 KRACK Test"
                          color="var(--error)"
                          onClick={() => onAction('krack', net)}
                          size="xs"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}