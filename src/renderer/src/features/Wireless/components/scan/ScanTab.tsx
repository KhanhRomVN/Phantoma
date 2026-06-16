// ============================================================================
// ScanTab — WiFi network scanner and results table
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { Scan, Monitor, Search } from 'lucide-react';
import type { WiFiNetwork, Encryption, ScanConfig } from '../../types';
import { ENC_PALETTE } from '../../constants';
import { SCAN_FILTERS } from '../../constants/scan';
import { signalBar, progressBar, encBadge } from '../../utils';
import { Btn } from '../shared/Btn';
import { ClientBadge } from '../shared/ClientBadge';
import { fmtNum } from '../../utils';

// Inline Badge component
function Badge({ label, color }: { label: string; color: string }) {
  // Map CSS variables to actual hex colors for background/border opacity
  const colorMap: Record<string, string> = {
    'var(--text-secondary)': '#9ca3af',
    'var(--success)': '#10b981',
    'var(--primary)': '#3686ff',
    'var(--accent-purple)': '#a78bfa',
  };
  const resolvedColor = colorMap[color] || color;

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

interface ScanTabProps {
  networks: WiFiNetwork[];
  onAction: (action: string, net: WiFiNetwork) => void;
  isScanning: boolean;
  onScan: () => void;
  scanConfig: ScanConfig;
  onScanConfig: (c: ScanConfig) => void;
  expandedRow: string | null;
  setExpandedRow: (id: string | null) => void;
  onTooltipShow?: (tooltip: { text: string; x: number; y: number } | null) => void;
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
  onTooltipShow,
}: ScanTabProps) {
const [sortKey, setSortKey] = useState<'signal' | 'ssid' | 'encryption' | 'crackProbability'>(
    'signal',
  );
  const [filterEnc, setFilterEnc] = useState<string>('all');
  const [filterVuln, setFilterVuln] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; netId: string } | null>(null);
  
  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const interfaceRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown === 'interface' && interfaceRef.current && !interfaceRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      } else if (openDropdown === 'band' && bandRef.current && !bandRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      } else if (openDropdown === 'channel' && channelRef.current && !channelRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);
  const filtered = [...networks]
    .filter((n) => filterEnc === 'all' || n.encryption === filterEnc)
    .filter(
      (n) => !filterVuln || n.wpsVulnerable || n.crackProbability >= 70 || n.encryption === 'wep',
    )
    .filter((n) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return n.ssid.toLowerCase().includes(term) || n.bssid.toLowerCase().includes(term);
    });

  const sorted = [...filtered].sort((a, b) => {
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
    <div className="flex flex-col gap-2">
      {/* Scan Config Row - Redesigned */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-card-background border border-border rounded-lg">
        {/* Interface Dropdown */}
        <div className="flex items-center gap-1.5" ref={interfaceRef}>
          <span className="text-[11px] font-bold text-text-secondary tracking-wide">INTERFACE</span>
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'interface' ? null : 'interface')}
              className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium bg-input-background border border-border hover:border-primary/50 transition-all min-w-[100px]"
            >
              <span className="text-text-primary">{scanConfig.interface}</span>
              <svg
                className={`w-3 h-3 text-text-secondary transition-transform ${openDropdown === 'interface' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === 'interface' && (
              <div className="absolute top-full left-0 mt-1 w-full min-w-[140px] bg-card-background border border-border rounded-md shadow-lg z-10 py-1">
                {['wlan0mon', 'wlan1mon', 'wlan2mon'].map((i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onScanConfig({ ...scanConfig, interface: i });
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                      scanConfig.interface === i
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-primary hover:bg-card-background-hover'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Band Dropdown */}
        <div className="flex items-center gap-1.5" ref={bandRef}>
          <span className="text-[11px] font-bold text-text-secondary tracking-wide">BAND</span>
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'band' ? null : 'band')}
              className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium bg-input-background border border-border hover:border-primary/50 transition-all min-w-[100px]"
            >
              <span className="text-text-primary">
                {scanConfig.band === 'all' ? 'All Bands' : `${scanConfig.band} GHz`}
              </span>
              <svg
                className={`w-3 h-3 text-text-secondary transition-transform ${openDropdown === 'band' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === 'band' && (
              <div className="absolute top-full left-0 mt-1 w-full min-w-[120px] bg-card-background border border-border rounded-md shadow-lg z-10 py-1">
                {[
                  { value: 'all', label: 'All Bands' },
                  { value: '2.4', label: '2.4 GHz' },
                  { value: '5', label: '5 GHz' },
                  { value: '6', label: '6 GHz' },
                ].map((b) => (
                  <button
                    key={b.value}
                    onClick={() => {
                      onScanConfig({ ...scanConfig, band: b.value as ScanConfig['band'] });
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                      scanConfig.band === b.value
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-primary hover:bg-card-background-hover'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Channel Dropdown */}
        <div className="flex items-center gap-1.5" ref={channelRef}>
          <span className="text-[11px] font-bold text-text-secondary tracking-wide">CHANNEL</span>
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'channel' ? null : 'channel')}
              className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium bg-input-background border border-border hover:border-primary/50 transition-all min-w-[90px]"
            >
              <span className="text-text-primary">
                {scanConfig.channel === 'all' ? 'Hop All' : `CH ${scanConfig.channel}`}
              </span>
              <svg
                className={`w-3 h-3 text-text-secondary transition-transform ${openDropdown === 'channel' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === 'channel' && (
              <div className="absolute top-full left-0 mt-1 w-32 max-h-60 overflow-y-auto bg-card-background border border-border rounded-md shadow-lg z-10 py-1">
                <button
                  onClick={() => {
                    onScanConfig({ ...scanConfig, channel: 'all' });
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                    scanConfig.channel === 'all'
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-primary hover:bg-card-background-hover'
                  }`}
                >
                  Hop All
                </button>
                {Array.from({ length: 14 }, (_, i) => i + 1).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onScanConfig({ ...scanConfig, channel: c });
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                      scanConfig.channel === c
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-primary hover:bg-card-background-hover'
                    }`}
                  >
                    CH {c}
                  </button>
                ))}
                <div className="border-t border-border my-1"></div>
                {[36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 149, 153, 157, 161, 165].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onScanConfig({ ...scanConfig, channel: c });
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                      scanConfig.channel === c
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-primary hover:bg-card-background-hover'
                    }`}
                  >
                    CH {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1.5 ml-0 sm:ml-auto">
          <button
            onClick={onScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-bold bg-primary text-text-foreground transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Scan size={13} />
            {isScanning ? 'SCANNING...' : 'Start Scan'}
          </button>
          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-bold border border-primary text-primary bg-transparent transition-all duration-150 hover:bg-primary/10"
          >
            <Monitor size={13} />
            Enable Monitor
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[13px] text-text-secondary font-bold pl-1">Filters:</span>
        {SCAN_FILTERS.map((filter) => {
          const isActive = filterEnc === filter.id;
          const activeColor = filter.id === 'all' ? ACCENT : filter.color;

          // Special styling for ALL badge when active (match Start Scan button)
          if (filter.id === 'all' && isActive) {
            return (
              <button
                key={filter.id}
                onClick={() => {
                  setFilterEnc(filter.id);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-primary text-text-foreground transition-all duration-150 hover:opacity-90 font-mono"
              >
                {filter.label}
              </button>
            );
          }

          // Tooltip text for non-ALL filters in Vietnamese
          const getTooltipText = (id: string) => {
            const tooltips: Record<string, string> = {
              open: 'Lọc các mạng không có mật khẩu (Open/WEP)',
              wep: 'Lọc các mạng sử dụng mã hóa WEP (dễ bị tấn công)',
              wpa: 'Lọc các mạng sử dụng mã hóa WPA',
              wpa2: 'Lọc các mạng sử dụng mã hóa WPA2 (phổ biến nhất)',
              wpa3: 'Lọc các mạng sử dụng mã hóa WPA3 (bảo mật cao nhất)',
              enterprise: 'Lọc các mạng doanh nghiệp sử dụng xác thực RADIUS/Enterprise',
            };
            return tooltips[id] || `Lọc theo ${filter.label}`;
          };

          const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
            // Show tooltip
            if (onTooltipShow) {
              const rect = e.currentTarget.getBoundingClientRect();
              onTooltipShow({ text: getTooltipText(filter.id), x: rect.left, y: rect.bottom + 6 });
            }
            // Change background on hover if not active
            if (!isActive) {
              e.currentTarget.style.backgroundColor = 'var(--card-background-hover)';
            }
          };

          const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
            // Hide tooltip
            if (onTooltipShow) {
              onTooltipShow(null);
            }
            // Reset background if not active
            if (!isActive) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          };

          return (
            <button
              key={filter.id}
              onClick={() => {
                setFilterEnc(filter.id);
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.08em',
                border: isActive ? `1px solid ${activeColor}80` : '1px solid var(--border)',
                backgroundColor: isActive ? `${activeColor}25` : 'transparent',
                color: isActive ? activeColor : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {filter.label}
            </button>
          );
        })}
        <div className="ml-auto relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 -mt-0.5 text-text-primary"
          />
          <input
            type="text"
            placeholder="Tìm kiếm theo SSID hoặc BSSID..."
            className="bg-input-background border border-border text-text-primary text-[11px] py-1.5 pl-7 pr-2.5 rounded font-inherit outline-none w-96 transition-colors duration-150 focus:border-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table Container with Border */}
      <div className="border border-border rounded-md overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[90px_1fr_60px_80px_70px_70px_80px_100px] gap-1.5 py-1.5 px-2.5 border-b border-border bg-table-header-background">
          {[
            {
              label: 'SIGNAL',
              tooltip:
                'Cường độ tín hiệu (dBm). Xanh: mạnh (≥ -55), Cam: trung bình (≥ -72), Đỏ: yếu (< -72)',
              textAlign: 'left',
            },
            {
              label: 'SSID / BSSID',
              tooltip: 'Tên mạng (SSID) và địa chỉ MAC của Access Point (BSSID)',
              textAlign: 'left',
            },
            { label: 'CH', tooltip: 'Kênh WiFi đang hoạt động', textAlign: 'center' },
            { label: 'BAND', tooltip: 'Băng tần: 2.4GHz, 5GHz hoặc 6GHz', textAlign: 'center' },
            {
              label: 'ENC',
              tooltip: 'Phương thức mã hóa: OPEN, WEP, WPA, WPA2, WPA3, ENTERPRISE',
              textAlign: 'center',
            },
            {
              label: 'WPS',
              tooltip:
                'Trạng thái WPS: ✓ OK (hoạt động), ⚡ VULN (dễ bị tấn công), 🔒 LOCK (bị khóa)',
              textAlign: 'center',
            },
            {
              label: 'CLIENTS',
              tooltip: 'Số lượng client đang kết nối đến mạng này',
              textAlign: 'center',
            },
            {
              label: 'CRACK %',
              tooltip: 'Xác suất bẻ khóa mật khẩu dựa trên độ mạnh của mã hóa và cấu hình',
              textAlign: 'center',
            },
          ].map((h) => {
            const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
              if (onTooltipShow) {
                const rect = e.currentTarget.getBoundingClientRect();
                onTooltipShow({ text: h.tooltip, x: rect.left, y: rect.bottom + 6 });
              }
            };
            const handleMouseLeave = () => {
              if (onTooltipShow) {
                onTooltipShow(null);
              }
            };
            return (
              <span
                key={h.label}
                className="text-xs text-text-secondary font-bold tracking-[0.1em] cursor-help"
                style={{ textAlign: h.textAlign as React.CSSProperties['textAlign'] }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {h.label}
              </span>
            );
          })}
        </div>

        {/* Network Rows */}
        <div className="flex flex-col gap-0.5">
          {sorted.map((net) => {
            const exp = expandedRow === net.id;
            return (
              <div
                key={net.id}
                className={`transition-all duration-150 rounded ${exp ? 'bg-input-background border border-border' : 'border border-transparent'}`}
                style={exp ? {} : { background: 'transparent' }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, netId: net.id });
                }}
              >
                <div
                  onClick={() => setExpandedRow(exp ? null : net.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr 60px 80px 70px 70px 80px 100px',
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
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {net.hidden ? '‹hidden›' : net.ssid}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {net.hidden && <Badge label="HIDDEN" color="var(--text-secondary)" />}
                        {net.crackedPassword && <Badge label="CRACKED" color="var(--green)" />}
                        {net.handshakeCaptured && <Badge label="HS" color={ACCENT} />}
                        {net.pmkidCaptured && <Badge label="PMKID" color="var(--accent-purple)" />}
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {net.bssid} · {net.vendor}
                    </div>
                  </div>

                  {/* Channel */}
                  <div
                    style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}
                  >
                    {net.channel}
                  </div>

                  {/* Band */}
                  <div
                    style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}
                  >
                    {net.band}
                  </div>

                  {/* Encryption */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        color: ENC_PALETTE[net.encryption]?.color || 'var(--text-secondary)',
                      }}
                    >
                      {net.encryption.toUpperCase()}
                    </span>
                  </div>

                  {/* WPS */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {net.wps ? (
                      <span
                        className={
                          net.wpsVulnerable
                            ? 'text-error'
                            : net.wpsLocked
                              ? 'text-text-secondary'
                              : 'text-warning'
                        }
                      >
                        {net.wpsVulnerable ? '⚡ VULN' : net.wpsLocked ? '🔒 LOCK' : '✓ OK'}
                      </span>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </div>

                  {/* Clients */}
                  <div
                    style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}
                  >
                    {net.clients.length}
                  </div>

                  {/* Crack % */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span
                      className={
                        net.crackProbability >= 80
                          ? 'text-success'
                          : net.crackProbability >= 50
                            ? 'text-warning'
                            : 'text-error'
                      }
                      style={{ fontSize: 11, fontWeight: 700 }}
                    >
                      {net.crackProbability}%
                    </span>
                  </div>
                </div>

                {/* Expanded Row Details - No cards, with dividers */}
                {exp && (
                  <div className="p-4 pt-2 border-t border-border mt-1">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Network Info Section */}
                      <div className="flex-1">
                        <div className="text-[10px] font-bold text-blue-400 mb-2 tracking-wide uppercase flex items-center gap-2">
                          <span className="w-1 h-3 bg-blue-400 rounded-full"></span>
                          NETWORK INFO
                        </div>
                        <div className="space-y-1.5">
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
                            <div key={k as string} className="flex justify-between text-[11px]">
                              <span className="text-blue-300/80 font-medium">{k}</span>
                              <span className="text-text-primary font-mono">{v}</span>
                            </div>
                          ))}
                          {net.wpsPin && (
                            <div className="flex justify-between text-[11px]">
                              <span className="text-blue-300/80 font-medium">WPS PIN</span>
                              <span className="text-error font-bold font-mono">{net.wpsPin}</span>
                            </div>
                          )}
                          {net.eapType && (
                            <div className="flex justify-between text-[11px]">
                              <span className="text-blue-300/80 font-medium">EAP Type</span>
                              <span className="text-warning font-mono">{net.eapType}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="hidden md:block w-px bg-border self-stretch"></div>

                      {/* Clients Section */}
                      <div className="flex-1">
                        <div className="text-[10px] font-bold text-purple-400 mb-2 tracking-wide uppercase flex items-center gap-2">
                          <span className="w-1 h-3 bg-purple-400 rounded-full"></span>
                          CLIENTS ({net.clients.length})
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1.5">
                          {net.clients.length === 0 ? (
                            <div className="text-text-secondary text-[11px] text-center py-2">
                              No clients detected
                            </div>
                          ) : (
                            net.clients.map((c) => (
                              <div
                                key={c.mac}
                                className="flex justify-between items-center text-[11px] p-1.5 bg-input-background rounded"
                              >
                                <span className="font-mono text-text-primary">{c.mac}</span>
                                <span className="text-text-secondary">{c.vendor || 'Unknown'}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="hidden md:block w-px bg-border self-stretch"></div>

                      {/* Capture Status Section */}
                      <div className="flex-1">
                        <div className="text-[10px] font-bold text-green-400 mb-2 tracking-wide uppercase flex items-center gap-2">
                          <span className="w-1 h-3 bg-green-400 rounded-full"></span>
                          CAPTURE STATUS
                        </div>
                        <div className="space-y-2">
                          {[
                            [
                              'Handshake',
                              net.handshakeCaptured ? `✓ ${net.handshakeFile}` : '✗ Not captured',
                              net.handshakeCaptured ? 'text-success' : 'text-text-secondary',
                            ],
                            [
                              'PMKID',
                              net.pmkidCaptured ? `✓ ${net.pmkidFile}` : '✗ Not captured',
                              net.pmkidCaptured ? 'text-purple-400' : 'text-text-secondary',
                            ],
                            [
                              'Password',
                              net.crackedPassword ?? '—',
                              net.crackedPassword ? 'text-success' : 'text-text-secondary',
                            ],
                          ].map(([k, v, c]) => (
                            <div
                              key={k as string}
                              className="flex justify-between items-center text-[11px]"
                            >
                              <span className="text-green-300/80 font-medium">{k}</span>
                              <span className={`${c} font-bold font-mono`}>{v}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-2 flex flex-wrap gap-2">
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
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Table Footer */}
        <div className="bg-table-footer-background px-3 py-2 text-xs text-text-secondary border-t border-border flex justify-between items-center">
          <span>Total: {sorted.length} networks</span>
          <span>Page 1 of {Math.ceil(sorted.length / 50) || 1}</span>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card-background border border-border rounded-md shadow-lg py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-card-background-hover transition-colors flex items-center gap-2"
            onClick={() => {
              setExpandedRow(contextMenu.netId === expandedRow ? null : contextMenu.netId);
              setContextMenu(null);
            }}
          >
            <span>🔍</span>
            <span>Xem chi tiết</span>
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}
