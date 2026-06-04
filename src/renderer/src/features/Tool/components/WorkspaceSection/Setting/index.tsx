// src/renderer/src/features/Tool/components/WorkspaceSection/Setting/index.tsx
// ============================================================================
// GHOST PROTOCOL — OPERATOR SETTINGS
// Aesthetic: Cyberpunk Terminal · Tactical Config Panel
// ============================================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../../../../../shared/lib/utils';

// ============================================================================
// MOCK DATA
// ============================================================================

const OPERATOR_PROFILE = {
  callsign: 'SPECTER_7',
  uid: 'OP-2025-0047',
  clearance: 'TOP SECRET',
  created: '2024-01-15',
  lastLogin: '2025-06-04T03:47:22Z',
  sessions: 1247,
  keyFingerprint: 'SHA256:xK9mP2qR5tY8wA3s',
  avatar: 'SP',
};

const NETWORK_CONFIG = {
  proxyType: 'SOCKS5',
  proxyHost: '127.0.0.1',
  proxyPort: 9050,
  torEnabled: true,
  torCircuit: 'SJC → NL → DE → exit',
  vpnActive: false,
  vpnProvider: 'Mullvad',
  dnsOverHttps: true,
  dnsProvider: 'Cloudflare 1.1.1.1',
  ipv6Leak: false,
  dnsLeak: false,
  webRtcLeak: false,
  currentExit: '185.220.101.47',
  exitCountry: 'Germany',
};

const API_KEYS = [
  {
    name: 'Shodan',
    key: 'xK9m••••••••P2qR',
    scopes: ['search', 'scan', 'dns'],
    active: true,
    usage: 73,
    limit: 100,
    expires: '2026-01-15',
  },
  {
    name: 'VirusTotal',
    key: '7Yt3••••••••mN8v',
    scopes: ['file', 'url', 'ip', 'domain'],
    active: true,
    usage: 45,
    limit: 500,
    expires: '2025-12-31',
  },
  {
    name: 'SecurityTrails',
    key: 'sT92••••••••Lk1e',
    scopes: ['dns', 'whois', 'history'],
    active: true,
    usage: 88,
    limit: 50,
    expires: '2025-09-01',
  },
  {
    name: 'Hunter.io',
    key: 'hU71••••••••Rz5q',
    scopes: ['email', 'verify', 'domain'],
    active: true,
    usage: 22,
    limit: 25,
    expires: '2025-11-30',
  },
  {
    name: 'Censys',
    key: 'cS43••••••••Wm6x',
    scopes: ['hosts', 'certs', 'data'],
    active: false,
    usage: 0,
    limit: 250,
    expires: '2026-03-01',
  },
  {
    name: 'GreyNoise',
    key: 'gN85••••••••Jk4p',
    scopes: ['ip', 'gnql', 'riot'],
    active: true,
    usage: 11,
    limit: 50,
    expires: '2026-06-01',
  },
  {
    name: 'Spyse',
    key: 'sp19••••••••Mx7c',
    scopes: ['domain', 'ip', 'email'],
    active: false,
    usage: 0,
    limit: 100,
    expires: '2025-07-15',
  },
  {
    name: 'LeakIX',
    key: 'lx62••••••••Nt3b',
    scopes: ['search', 'ip', 'host'],
    active: true,
    usage: 55,
    limit: 200,
    expires: '2026-02-28',
  },
];

const SCAN_PRESETS = [
  {
    id: 'stealth',
    name: 'Ghost Mode',
    icon: '👻',
    desc: 'Max stealth · TOR · no banners',
    threads: 1,
    delay: 3000,
    timeout: 10,
    aggressive: false,
    active: true,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    icon: '⚖️',
    desc: 'Speed vs stealth tradeoff',
    threads: 5,
    delay: 500,
    timeout: 5,
    aggressive: false,
    active: false,
  },
  {
    id: 'aggressive',
    name: 'Aggro',
    icon: '⚡',
    desc: 'Fast · loud · full banner grab',
    threads: 20,
    delay: 0,
    timeout: 2,
    aggressive: true,
    active: false,
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: '⚙️',
    desc: 'User-defined parameters',
    threads: 8,
    delay: 100,
    timeout: 5,
    aggressive: false,
    active: false,
  },
];

const TOOL_INTEGRATIONS = [
  { name: 'Nmap', version: '7.94', path: '/usr/bin/nmap', status: 'active', category: 'scanner' },
  {
    name: 'Masscan',
    version: '1.3.2',
    path: '/usr/local/bin/masscan',
    status: 'active',
    category: 'scanner',
  },
  {
    name: 'TheHarvester',
    version: '4.4.3',
    path: '/opt/theHarvester',
    status: 'active',
    category: 'osint',
  },
  {
    name: 'Amass',
    version: '4.1.0',
    path: '/usr/local/bin/amass',
    status: 'active',
    category: 'dns',
  },
  {
    name: 'Subfinder',
    version: '2.6.3',
    path: '/usr/local/bin/subfinder',
    status: 'active',
    category: 'dns',
  },
  {
    name: 'Nuclei',
    version: '3.1.4',
    path: '/usr/local/bin/nuclei',
    status: 'active',
    category: 'vuln',
  },
  {
    name: 'Gobuster',
    version: '3.6.0',
    path: '/usr/bin/gobuster',
    status: 'inactive',
    category: 'fuzz',
  },
  { name: 'Nikto', version: '2.1.6', path: '/usr/bin/nikto', status: 'inactive', category: 'web' },
  {
    name: 'WPScan',
    version: '3.8.24',
    path: '/usr/local/bin/wpscan',
    status: 'active',
    category: 'web',
  },
  {
    name: 'SQLmap',
    version: '1.7.9',
    path: '/usr/bin/sqlmap',
    status: 'active',
    category: 'exploit',
  },
  {
    name: 'Metasploit',
    version: '6.3.35',
    path: '/opt/metasploit',
    status: 'inactive',
    category: 'exploit',
  },
  {
    name: 'Burp Suite',
    version: '2024.6',
    path: '/opt/burpsuite',
    status: 'active',
    category: 'web',
  },
];

const AUDIT_LOG = [
  {
    time: '03:47:22',
    action: 'SCAN_STARTED',
    target: 'phantom.tech',
    ip: '198.51.100.78',
    severity: 'info',
  },
  { time: '03:45:11', action: 'API_CALL', target: 'Shodan · IP lookup', ip: '—', severity: 'info' },
  {
    time: '03:42:09',
    action: 'TOR_ROTATED',
    target: 'Circuit #1247',
    ip: '185.220.101.47',
    severity: 'warn',
  },
  {
    time: '03:38:55',
    action: 'EXPORT_PDF',
    target: 'recon_phantom_2025.pdf',
    ip: '—',
    severity: 'info',
  },
  { time: '03:31:00', action: 'KEY_ROTATED', target: 'Shodan API', ip: '—', severity: 'warn' },
  { time: '03:15:47', action: 'LOGIN', target: 'SPECTER_7', ip: '127.0.0.1', severity: 'info' },
  { time: '02:58:30', action: 'FAILED_AUTH', target: 'SecurityTrails', ip: '—', severity: 'crit' },
  {
    time: '02:44:12',
    action: 'SCAN_STARTED',
    target: 'darkweb-target.onion',
    ip: '10.x.x.x',
    severity: 'info',
  },
];

const USAGE_STATS = [
  { day: 'MON', scans: 8, api: 42, alerts: 2 },
  { day: 'TUE', scans: 14, api: 87, alerts: 5 },
  { day: 'WED', scans: 6, api: 33, alerts: 1 },
  { day: 'THU', scans: 21, api: 156, alerts: 9 },
  { day: 'FRI', scans: 19, api: 120, alerts: 7 },
  { day: 'SAT', scans: 4, api: 18, alerts: 0 },
  { day: 'SUN', scans: 11, api: 74, alerts: 3 },
];

const NOTIFICATION_RULES = [
  {
    id: 1,
    event: 'Critical CVE Detected',
    channel: 'Telegram',
    active: true,
    threshold: 'CVSS ≥ 9.0',
  },
  { id: 2, event: 'Dark Web Mention', channel: 'Email', active: true, threshold: 'Any hit' },
  { id: 3, event: 'New Subdomain', channel: 'Slack', active: false, threshold: '>5 new/scan' },
  { id: 4, event: 'API Quota 80%', channel: 'Telegram', active: true, threshold: '80% used' },
  { id: 5, event: 'Scan Complete', channel: 'Webhook', active: true, threshold: 'Always' },
  {
    id: 6,
    event: 'TOR Circuit Changed',
    channel: 'In-App',
    active: false,
    threshold: 'Every change',
  },
];

const STORAGE_INFO = {
  total: 512,
  used: 187,
  breakdown: [
    { label: 'Scan Reports', size: 84, color: '#0af' },
    { label: 'Raw Dumps', size: 62, color: '#ff2d55' },
    { label: 'Screenshots', size: 28, color: '#bf5af2' },
    { label: 'Exports', size: 13, color: '#f5a623' },
  ],
};

// ============================================================================
// DESIGN TOKENS
// ============================================================================
const C = {
  bg0: '#04060a',
  bg1: '#070b12',
  bg2: '#0c1220',
  bg3: '#111827',
  border: '#162030',
  borderHover: '#1e2e45',
  text0: '#e8f0ff',
  text1: '#8da0c0',
  text2: '#4a5a7a',
  text3: '#2a3548',
  cyan: '#00c8ff',
  red: '#ff2d55',
  orange: '#ff6b35',
  yellow: '#f5a623',
  green: '#30d158',
  purple: '#bf5af2',
  pink: '#ff3b8a',
};

// ============================================================================
// UTILITY
// ============================================================================
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function Badge({
  color,
  children,
  dot,
}: {
  color: string;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase font-mono px-1.5 py-0.5 rounded-sm"
      style={{ color, border: `1px solid ${color}30`, background: `${color}12` }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

function SectionLabel({
  children,
  accent = C.cyan,
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="w-px h-3 rounded-full" style={{ background: accent }} />
      <span
        className="text-[9px] font-bold tracking-[0.15em] uppercase font-mono"
        style={{ color: accent + 'aa' }}
      >
        {children}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(to right, ${accent}30, transparent)` }}
      />
    </div>
  );
}

function Toggle({
  value,
  onChange,
  accent = C.cyan,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-8 h-4 rounded-full transition-all duration-300 shrink-0"
      style={{
        background: value ? `${accent}40` : C.bg3,
        border: `1px solid ${value ? accent : C.border}`,
      }}
    >
      <div
        className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all duration-300"
        style={{
          left: value ? 'calc(100% - 13px)' : '2px',
          background: value ? accent : C.text3,
          boxShadow: value ? `0 0 6px ${accent}` : 'none',
        }}
      />
    </button>
  );
}

function GlowCard({
  children,
  className,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <div
      className={cn('rounded-lg p-3 relative overflow-hidden', className)}
      style={{
        background: C.bg2,
        border: `1px solid ${C.border}`,
        boxShadow: accent ? `inset 0 0 30px ${accent}05` : undefined,
      }}
    >
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-60"
          style={{ background: `linear-gradient(to right, transparent, ${accent}, transparent)` }}
        />
      )}
      {children}
    </div>
  );
}

// ============================================================================
// MINI CHARTS
// ============================================================================
function SparkBar({
  data,
  colorKey,
  max,
}: {
  data: typeof USAGE_STATS;
  colorKey: 'scans' | 'api' | 'alerts';
  max?: number;
}) {
  const m = max ?? Math.max(...data.map((d) => d[colorKey]));
  const color = colorKey === 'scans' ? C.cyan : colorKey === 'api' ? C.purple : C.red;
  return (
    <div className="flex items-end gap-[3px] h-10">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className="w-full rounded-sm transition-all"
            style={{
              height: `${(d[colorKey] / m) * 36}px`,
              background: `linear-gradient(to top, ${color}, ${color}60)`,
              minHeight: '2px',
            }}
          />
          <span className="text-[6px] font-mono" style={{ color: C.text3 }}>
            {d.day.slice(0, 1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({
  segments,
  size = 80,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.bg3} strokeWidth="10" />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const gap = circ - dash;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
            style={{ filter: `drop-shadow(0 0 4px ${seg.color}80)` }}
          />
        );
        offset += dash;
        return el;
      })}
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        fill={C.text0}
        fontFamily="monospace"
      >
        {total}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 9}
        textAnchor="middle"
        fontSize="6"
        fill={C.text2}
        fontFamily="monospace"
      >
        GB
      </text>
    </svg>
  );
}

function UsageBar({ used, limit, color }: { used: number; limit: number; color: string }) {
  const pct = (used / limit) * 100;
  const danger = pct >= 80;
  const c = danger ? C.red : pct >= 60 ? C.yellow : color;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: C.bg3 }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(to right, ${c}80, ${c})`,
            boxShadow: pct > 50 ? `0 0 6px ${c}60` : undefined,
          }}
        />
      </div>
      <span className="text-[8px] font-mono shrink-0" style={{ color: c }}>
        {used}/{limit}
      </span>
    </div>
  );
}

function NetworkTopology() {
  const nodes = [
    { id: 'you', label: 'YOU', x: 50, y: 50, color: C.cyan, r: 12 },
    { id: 'tor1', label: 'TOR-1', x: 25, y: 25, color: C.purple, r: 8 },
    { id: 'tor2', label: 'TOR-2', x: 75, y: 25, color: C.purple, r: 8 },
    { id: 'tor3', label: 'TOR-3', x: 50, y: 15, color: C.purple, r: 8 },
    { id: 'exit', label: 'EXIT', x: 50, y: 80, color: C.green, r: 10 },
  ];
  const edges = [
    ['you', 'tor1'],
    ['you', 'tor2'],
    ['you', 'tor3'],
    ['tor1', 'exit'],
    ['tor2', 'exit'],
    ['tor3', 'exit'],
  ];
  const getNode = (id: string) => nodes.find((n) => n.id === id)!;
  return (
    <svg viewBox="0 0 100 95" className="w-full h-full">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {edges.map(([a, b], i) => {
        const na = getNode(a),
          nb = getNode(b);
        return (
          <line
            key={i}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke={C.purple}
            strokeWidth="0.5"
            strokeOpacity="0.4"
            strokeDasharray="2 2"
          />
        );
      })}
      {nodes.map((n) => (
        <g key={n.id} filter="url(#glow)">
          <circle cx={n.x} cy={n.y} r={n.r + 3} fill={`${n.color}10`} />
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={`${n.color}20`}
            stroke={n.color}
            strokeWidth="0.8"
          />
          <text
            x={n.x}
            y={n.y + 0.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="5"
            fill={n.color}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ActivityHeatmap() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const data = days.map(() => hours.map(() => Math.random()));
  return (
    <div className="flex gap-[3px]">
      <div className="flex flex-col justify-between pr-1">
        {days.map((d, i) => (
          <span key={i} className="text-[7px] font-mono" style={{ color: C.text3 }}>
            {d}
          </span>
        ))}
      </div>
      <div className="flex-1 grid gap-[2px]" style={{ gridTemplateRows: `repeat(7, 1fr)` }}>
        {data.map((row, ri) => (
          <div key={ri} className="flex gap-[2px]">
            {row.map((val, ci) => (
              <div
                key={ci}
                className="flex-1 rounded-sm"
                style={{
                  height: '7px',
                  background:
                    val > 0.8 ? C.red : val > 0.6 ? C.orange : val > 0.3 ? `${C.cyan}60` : C.bg3,
                  opacity: val > 0.1 ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: OPERATOR
// ============================================================================
function TabOperator() {
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#04060a]">
      <div className="grid grid-cols-12 gap-2">
        {/* Profile card - left */}
        <div className="col-span-4">
          <GlowCard accent={C.cyan}>
            <SectionLabel accent={C.cyan}>Operator Profile</SectionLabel>
            <div className="flex flex-col items-center gap-3 py-2">
              {/* Avatar */}
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold font-mono"
                  style={{
                    background: `radial-gradient(circle at 40% 35%, ${C.cyan}30, ${C.bg3})`,
                    border: `2px solid ${C.cyan}50`,
                    color: C.cyan,
                    boxShadow: `0 0 20px ${C.cyan}30`,
                  }}
                >
                  {OPERATOR_PROFILE.avatar}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                  style={{ background: C.green, border: `2px solid ${C.bg2}` }}
                >
                  ●
                </div>
              </div>

              <div className="text-center">
                <div className="text-[14px] font-bold font-mono" style={{ color: C.text0 }}>
                  {OPERATOR_PROFILE.callsign}
                </div>
                <div className="text-[9px] font-mono mt-0.5" style={{ color: C.text2 }}>
                  {OPERATOR_PROFILE.uid}
                </div>
              </div>

              <Badge color={C.red}>{OPERATOR_PROFILE.clearance}</Badge>
            </div>

            <div className="border-t mt-2 pt-2 space-y-1.5" style={{ borderColor: C.border }}>
              {[
                { k: 'Created', v: OPERATOR_PROFILE.created },
                { k: 'Last Login', v: '03:47 UTC' },
                { k: 'Total Sessions', v: OPERATOR_PROFILE.sessions.toString() },
                { k: 'PGP Fingerprint', v: OPERATOR_PROFILE.keyFingerprint },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-[9px] font-mono" style={{ color: C.text3 }}>
                    {k}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: C.text1 }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setEditMode(!editMode)}
              className="mt-2.5 w-full py-1.5 rounded text-[9px] font-bold font-mono uppercase tracking-widest transition-all"
              style={{
                background: editMode ? `${C.cyan}20` : 'transparent',
                border: `1px solid ${C.cyan}40`,
                color: C.cyan,
              }}
            >
              {editMode ? '✓ Save Changes' : '⟳ Edit Profile'}
            </button>
          </GlowCard>
        </div>

        {/* Right side — stats + activity */}
        <div className="col-span-8 flex flex-col gap-2">
          {/* Usage stats */}
          <GlowCard accent={C.purple}>
            <SectionLabel accent={C.purple}>Weekly Activity</SectionLabel>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div
                  className="text-[8px] font-mono mb-1.5 flex justify-between"
                  style={{ color: C.text3 }}
                >
                  <span>SCANS</span>
                  <span style={{ color: C.cyan }}>
                    {USAGE_STATS.reduce((a, d) => a + d.scans, 0)}
                  </span>
                </div>
                <SparkBar data={USAGE_STATS} colorKey="scans" />
              </div>
              <div>
                <div
                  className="text-[8px] font-mono mb-1.5 flex justify-between"
                  style={{ color: C.text3 }}
                >
                  <span>API CALLS</span>
                  <span style={{ color: C.purple }}>
                    {USAGE_STATS.reduce((a, d) => a + d.api, 0)}
                  </span>
                </div>
                <SparkBar data={USAGE_STATS} colorKey="api" />
              </div>
              <div>
                <div
                  className="text-[8px] font-mono mb-1.5 flex justify-between"
                  style={{ color: C.text3 }}
                >
                  <span>ALERTS</span>
                  <span style={{ color: C.red }}>
                    {USAGE_STATS.reduce((a, d) => a + d.alerts, 0)}
                  </span>
                </div>
                <SparkBar data={USAGE_STATS} colorKey="alerts" />
              </div>
            </div>
          </GlowCard>

          {/* Heatmap */}
          <GlowCard>
            <SectionLabel accent={C.orange}>Scan Activity Heatmap (24h)</SectionLabel>
            <ActivityHeatmap />
            <div className="flex items-center gap-2 mt-1.5 justify-end">
              {[
                { label: 'Low', color: `${C.cyan}60` },
                { label: 'Med', color: C.orange },
                { label: 'High', color: C.red },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{ background: l.color }} />
                  <span className="text-[7px] font-mono" style={{ color: C.text3 }}>
                    {l.label}
                  </span>
                </div>
              ))}
            </div>
          </GlowCard>

          {/* Storage */}
          <GlowCard>
            <SectionLabel accent={C.yellow}>Storage Usage</SectionLabel>
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 shrink-0">
                <DonutChart
                  size={80}
                  segments={STORAGE_INFO.breakdown.map((b) => ({
                    value: b.size,
                    color: b.color,
                    label: b.label,
                  }))}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                {STORAGE_INFO.breakdown.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-sm shrink-0"
                      style={{ background: b.color }}
                    />
                    <span className="text-[9px] font-mono w-24 shrink-0" style={{ color: C.text2 }}>
                      {b.label}
                    </span>
                    <div
                      className="flex-1 h-[3px] rounded-full overflow-hidden"
                      style={{ background: C.bg3 }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(b.size / STORAGE_INFO.used) * 100}%`,
                          background: b.color,
                        }}
                      />
                    </div>
                    <span className="text-[8px] font-mono" style={{ color: C.text1 }}>
                      {b.size} GB
                    </span>
                  </div>
                ))}
                <div className="pt-1 border-t" style={{ borderColor: C.border }}>
                  <div className="flex justify-between text-[8px] font-mono">
                    <span style={{ color: C.text3 }}>Total: {STORAGE_INFO.total} GB</span>
                    <span style={{ color: C.yellow }}>
                      {STORAGE_INFO.used}/{STORAGE_INFO.total} GB used
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Audit Log - full width */}
        <div className="col-span-12">
          <GlowCard>
            <SectionLabel accent={C.orange}>Recent Audit Log</SectionLabel>
            <div className="space-y-0">
              {AUDIT_LOG.map((l, i) => {
                const sc =
                  l.severity === 'crit' ? C.red : l.severity === 'warn' ? C.yellow : C.text2;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-2 py-1.5 rounded transition-colors hover:bg-[#111827]/50"
                    style={{ borderBottom: `1px solid ${C.border}` }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: sc, boxShadow: `0 0 4px ${sc}` }}
                    />
                    <span className="text-[9px] font-mono w-12 shrink-0" style={{ color: C.text3 }}>
                      {l.time}
                    </span>
                    <span
                      className="text-[9px] font-bold font-mono w-28 shrink-0"
                      style={{ color: sc }}
                    >
                      {l.action}
                    </span>
                    <span
                      className="text-[9px] font-mono flex-1 truncate"
                      style={{ color: C.text1 }}
                    >
                      {l.target}
                    </span>
                    {l.ip !== '—' && (
                      <span className="text-[8px] font-mono" style={{ color: C.text3 }}>
                        {l.ip}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: NETWORK
// ============================================================================
function TabNetwork() {
  const [cfg, setCfg] = useState(NETWORK_CONFIG);

  const leakChecks = [
    { k: 'IP Leak', v: !cfg.ipv6Leak, label: cfg.ipv6Leak ? 'LEAKING' : 'CLEAN' },
    { k: 'DNS Leak', v: !cfg.dnsLeak, label: cfg.dnsLeak ? 'LEAKING' : 'CLEAN' },
    { k: 'WebRTC Leak', v: !cfg.webRtcLeak, label: cfg.webRtcLeak ? 'LEAKING' : 'CLEAN' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#04060a]">
      <div className="grid grid-cols-12 gap-2">
        {/* Network topology */}
        <div className="col-span-4">
          <GlowCard accent={C.purple} className="h-full">
            <SectionLabel accent={C.purple}>Anonymization Chain</SectionLabel>
            <div className="h-32">
              <NetworkTopology />
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono" style={{ color: C.text2 }}>
                  TOR Circuit
                </span>
                <span
                  className="text-[8px] font-mono truncate max-w-[140px]"
                  style={{ color: C.purple }}
                >
                  {cfg.torCircuit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono" style={{ color: C.text2 }}>
                  Exit Node IP
                </span>
                <span className="text-[9px] font-mono font-bold" style={{ color: C.cyan }}>
                  {cfg.currentExit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono" style={{ color: C.text2 }}>
                  Exit Country
                </span>
                <span className="text-[9px] font-mono" style={{ color: C.green }}>
                  {cfg.exitCountry}
                </span>
              </div>
            </div>
            <button
              className="mt-2 w-full py-1.5 rounded text-[9px] font-bold font-mono uppercase tracking-widest"
              style={{
                background: `${C.purple}15`,
                border: `1px solid ${C.purple}40`,
                color: C.purple,
              }}
            >
              ⟳ Rotate Circuit
            </button>
          </GlowCard>
        </div>

        {/* Proxy & DNS settings */}
        <div className="col-span-5 flex flex-col gap-2">
          <GlowCard accent={C.cyan}>
            <SectionLabel accent={C.cyan}>Proxy Configuration</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[8px] font-mono mb-1" style={{ color: C.text3 }}>
                  PROXY TYPE
                </div>
                <div className="flex gap-1">
                  {['SOCKS5', 'HTTP', 'None'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setCfg((c) => ({ ...c, proxyType: t }))}
                      className="flex-1 py-1 rounded text-[8px] font-mono font-bold transition-all"
                      style={{
                        background: cfg.proxyType === t ? `${C.cyan}20` : 'transparent',
                        border: `1px solid ${cfg.proxyType === t ? C.cyan : C.border}`,
                        color: cfg.proxyType === t ? C.cyan : C.text3,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[8px] font-mono mb-1" style={{ color: C.text3 }}>
                  PORT
                </div>
                <input
                  value={cfg.proxyPort}
                  onChange={(e) => setCfg((c) => ({ ...c, proxyPort: +e.target.value }))}
                  className="w-full py-1 px-2 rounded text-[10px] font-mono outline-none"
                  style={{ background: C.bg3, border: `1px solid ${C.border}`, color: C.cyan }}
                />
              </div>
              <div className="col-span-2">
                <div className="text-[8px] font-mono mb-1" style={{ color: C.text3 }}>
                  HOST
                </div>
                <input
                  value={cfg.proxyHost}
                  onChange={(e) => setCfg((c) => ({ ...c, proxyHost: e.target.value }))}
                  className="w-full py-1 px-2 rounded text-[10px] font-mono outline-none"
                  style={{ background: C.bg3, border: `1px solid ${C.border}`, color: C.text1 }}
                />
              </div>
            </div>
          </GlowCard>

          <GlowCard>
            <SectionLabel accent={C.green}>DNS & Privacy</SectionLabel>
            <div className="space-y-2">
              {[
                {
                  k: 'TOR Routing',
                  v: cfg.torEnabled,
                  setter: (v: boolean) => setCfg((c) => ({ ...c, torEnabled: v })),
                  accent: C.purple,
                },
                {
                  k: 'VPN Active',
                  v: cfg.vpnActive,
                  setter: (v: boolean) => setCfg((c) => ({ ...c, vpnActive: v })),
                  accent: C.orange,
                },
                {
                  k: 'DNS over HTTPS',
                  v: cfg.dnsOverHttps,
                  setter: (v: boolean) => setCfg((c) => ({ ...c, dnsOverHttps: v })),
                  accent: C.green,
                },
              ].map(({ k, v, setter, accent }) => (
                <div
                  key={k}
                  className="flex items-center justify-between py-1 border-b"
                  style={{ borderColor: C.border }}
                >
                  <span className="text-[10px] font-mono" style={{ color: C.text1 }}>
                    {k}
                  </span>
                  <Toggle value={v} onChange={setter} accent={accent} />
                </div>
              ))}
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-[9px] font-mono" style={{ color: C.text2 }}>
                  DNS Provider
                </span>
                <span className="text-[9px] font-mono" style={{ color: C.cyan }}>
                  {cfg.dnsProvider}
                </span>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Leak check status */}
        <div className="col-span-3">
          <GlowCard accent={C.green} className="h-full">
            <SectionLabel accent={C.green}>Leak Detection</SectionLabel>
            <div className="space-y-2">
              {leakChecks.map((lc) => (
                <div
                  key={lc.k}
                  className="rounded p-2.5"
                  style={{
                    background: lc.v ? `${C.green}08` : `${C.red}08`,
                    border: `1px solid ${lc.v ? C.green : C.red}25`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono" style={{ color: C.text2 }}>
                      {lc.k}
                    </span>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: lc.v ? C.green : C.red,
                        boxShadow: `0 0 6px ${lc.v ? C.green : C.red}`,
                      }}
                    />
                  </div>
                  <div
                    className="text-[11px] font-bold font-mono mt-0.5"
                    style={{ color: lc.v ? C.green : C.red }}
                  >
                    {lc.label}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="mt-3 w-full py-1.5 rounded text-[9px] font-bold font-mono uppercase tracking-widest"
              style={{
                background: `${C.green}15`,
                border: `1px solid ${C.green}40`,
                color: C.green,
              }}
            >
              ▶ Run Leak Test
            </button>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: API KEYS
// ============================================================================
function TabAPIKeys() {
  const [keys, setKeys] = useState(API_KEYS);
  const [reveal, setReveal] = useState<Set<string>>(new Set());

  const toggleReveal = (name: string) => {
    setReveal((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const CATEGORY_COLOR: Record<string, string> = {
    scanner: C.cyan,
    osint: C.purple,
    vuln: C.red,
    intel: C.orange,
  };

  const totalUsage = keys.reduce((a, k) => a + k.usage, 0);
  const totalLimit = keys.reduce((a, k) => a + k.limit, 0);
  const activeCount = keys.filter((k) => k.active).length;

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#04060a]">
      <div className="grid grid-cols-12 gap-2">
        {/* Summary mini cards */}
        <div className="col-span-12 grid grid-cols-4 gap-2">
          {[
            {
              label: 'Total Keys',
              value: keys.length,
              color: C.cyan,
              sub: `${activeCount} active`,
            },
            {
              label: 'API Calls Today',
              value: totalUsage,
              color: C.purple,
              sub: `of ${totalLimit} limit`,
            },
            {
              label: 'Expiring Soon',
              value: keys.filter((k) => k.expires < '2025-10-01').length,
              color: C.red,
              sub: 'within 90 days',
            },
            {
              label: 'Inactive',
              value: keys.filter((k) => !k.active).length,
              color: C.text2,
              sub: 'disabled keys',
            },
          ].map((s) => (
            <GlowCard key={s.label} accent={s.color}>
              <div
                className="text-[8px] font-mono uppercase tracking-[0.1em] mb-1"
                style={{ color: C.text3 }}
              >
                {s.label}
              </div>
              <div
                className="text-[22px] font-bold font-mono leading-none"
                style={{ color: s.color }}
              >
                {s.value}
              </div>
              <div className="text-[8px] font-mono mt-0.5" style={{ color: C.text3 }}>
                {s.sub}
              </div>
            </GlowCard>
          ))}
        </div>

        {/* API Key Table */}
        <div className="col-span-8">
          <GlowCard>
            <SectionLabel accent={C.cyan}>API Key Vault</SectionLabel>
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Service', 'Key', 'Scopes', 'Usage', 'Expires', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="text-left pb-1.5 pr-2 text-[8px] uppercase tracking-widest font-normal"
                      style={{ color: C.text3 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr
                    key={k.name}
                    className="group"
                    style={{ borderBottom: `1px solid ${C.border}30` }}
                  >
                    <td className="py-1.5 pr-2">
                      <span className="font-bold" style={{ color: k.active ? C.text0 : C.text3 }}>
                        {k.name}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-1">
                        <span style={{ color: C.text2 }}>
                          {reveal.has(k.name) ? 'sk-' + k.name.toLowerCase() + '-real-key' : k.key}
                        </span>
                        <button
                          onClick={() => toggleReveal(k.name)}
                          className="opacity-0 group-hover:opacity-100 text-[8px]"
                          style={{ color: C.text3 }}
                        >
                          {reveal.has(k.name) ? '◉' : '◎'}
                        </button>
                      </div>
                    </td>
                    <td className="py-1.5 pr-2">
                      <div className="flex flex-wrap gap-0.5">
                        {k.scopes.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="text-[7px] px-1 py-px rounded"
                            style={{
                              background: `${C.cyan}15`,
                              color: C.cyan,
                              border: `1px solid ${C.cyan}25`,
                            }}
                          >
                            {s}
                          </span>
                        ))}
                        {k.scopes.length > 2 && (
                          <span className="text-[7px]" style={{ color: C.text3 }}>
                            +{k.scopes.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 pr-2 w-24">
                      <UsageBar used={k.usage} limit={k.limit} color={C.cyan} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <span style={{ color: k.expires < '2025-10-01' ? C.red : C.text2 }}>
                        {k.expires}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <Toggle
                        value={k.active}
                        onChange={(v) =>
                          setKeys((prev) =>
                            prev.map((pk) => (pk.name === k.name ? { ...pk, active: v } : pk)),
                          )
                        }
                        accent={C.green}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlowCard>
        </div>

        {/* Usage breakdown donut */}
        <div className="col-span-4 flex flex-col gap-2">
          <GlowCard accent={C.purple}>
            <SectionLabel accent={C.purple}>Usage Distribution</SectionLabel>
            <div className="w-28 h-28 mx-auto">
              <DonutChart
                size={112}
                segments={keys
                  .filter((k) => k.active && k.usage > 0)
                  .map((k) => ({
                    value: k.usage,
                    color:
                      CATEGORY_COLOR[k.name.toLowerCase().includes('nmap') ? 'scanner' : 'intel'] ??
                      C.cyan,
                    label: k.name,
                  }))}
              />
            </div>
            <div className="mt-2 space-y-1">
              {keys
                .filter((k) => k.active && k.usage > 0)
                .slice(0, 5)
                .map((k) => (
                  <div key={k.name} className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-sm shrink-0"
                      style={{ background: C.cyan }}
                    />
                    <span className="text-[8px] font-mono flex-1" style={{ color: C.text2 }}>
                      {k.name}
                    </span>
                    <span className="text-[8px] font-mono" style={{ color: C.text1 }}>
                      {k.usage}
                    </span>
                  </div>
                ))}
            </div>
          </GlowCard>

          <GlowCard>
            <SectionLabel accent={C.green}>Quick Add Key</SectionLabel>
            <div className="space-y-1.5">
              <input
                placeholder="Service name..."
                className="w-full px-2 py-1.5 rounded text-[9px] font-mono outline-none"
                style={{ background: C.bg3, border: `1px solid ${C.border}`, color: C.text1 }}
              />
              <input
                placeholder="API Key..."
                className="w-full px-2 py-1.5 rounded text-[9px] font-mono outline-none"
                style={{ background: C.bg3, border: `1px solid ${C.border}`, color: C.text1 }}
              />
              <button
                className="w-full py-1.5 rounded text-[9px] font-bold font-mono uppercase tracking-widest"
                style={{
                  background: `${C.green}15`,
                  border: `1px solid ${C.green}40`,
                  color: C.green,
                }}
              >
                + Add Key
              </button>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: SCAN ENGINE
// ============================================================================
function TabScanEngine() {
  const [presets, setPresets] = useState(SCAN_PRESETS);
  const [tools, setTools] = useState(TOOL_INTEGRATIONS);
  const [activePreset, setActivePreset] = useState('stealth');

  const CATEGORY_COLORS: Record<string, string> = {
    scanner: C.cyan,
    osint: C.purple,
    dns: C.green,
    vuln: C.red,
    fuzz: C.orange,
    web: C.yellow,
    exploit: C.pink,
  };

  const currentPreset = presets.find((p) => p.id === activePreset)!;

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#04060a]">
      <div className="grid grid-cols-12 gap-2">
        {/* Presets */}
        <div className="col-span-4">
          <GlowCard accent={C.orange}>
            <SectionLabel accent={C.orange}>Scan Presets</SectionLabel>
            <div className="space-y-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActivePreset(p.id)}
                  className="w-full text-left rounded p-2.5 transition-all"
                  style={{
                    background: activePreset === p.id ? `${C.orange}12` : 'transparent',
                    border: `1px solid ${activePreset === p.id ? C.orange + '50' : C.border}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span>{p.icon}</span>
                    <span
                      className="text-[10px] font-bold font-mono"
                      style={{ color: activePreset === p.id ? C.orange : C.text1 }}
                    >
                      {p.name}
                    </span>
                    {p.id === 'stealth' && <Badge color={C.green}>ACTIVE</Badge>}
                  </div>
                  <div className="text-[8px] font-mono mt-0.5" style={{ color: C.text3 }}>
                    {p.desc}
                  </div>
                </button>
              ))}
            </div>
          </GlowCard>
        </div>

        {/* Current preset config */}
        <div className="col-span-5">
          <GlowCard accent={C.cyan}>
            <SectionLabel accent={C.cyan}>
              {currentPreset.icon} {currentPreset.name} Config
            </SectionLabel>
            <div className="space-y-3">
              {[
                { k: 'Thread Count', v: currentPreset.threads, max: 50, color: C.cyan },
                { k: 'Delay (ms)', v: currentPreset.delay, max: 5000, color: C.purple },
                { k: 'Timeout (s)', v: currentPreset.timeout, max: 30, color: C.yellow },
              ].map(({ k, v, max, color }) => (
                <div key={k}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] font-mono" style={{ color: C.text2 }}>
                      {k}
                    </span>
                    <span className="text-[10px] font-bold font-mono" style={{ color }}>
                      {v}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={max}
                    defaultValue={v}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      accentColor: color,
                      background: `linear-gradient(to right, ${color} ${(v / max) * 100}%, ${C.bg3} 0)`,
                    }}
                  />
                </div>
              ))}

              <div
                className="flex items-center justify-between py-2 border-t"
                style={{ borderColor: C.border }}
              >
                <span className="text-[10px] font-mono" style={{ color: C.text1 }}>
                  Aggressive Mode
                </span>
                <Toggle value={currentPreset.aggressive} onChange={() => {}} accent={C.red} />
              </div>

              {currentPreset.aggressive && (
                <div
                  className="rounded p-2"
                  style={{ background: `${C.red}08`, border: `1px solid ${C.red}25` }}
                >
                  <span className="text-[8.5px] font-mono" style={{ color: C.red }}>
                    ⚠ Aggressive mode sends intrusive probes. Ensure explicit written authorization.
                  </span>
                </div>
              )}
            </div>
          </GlowCard>
        </div>

        {/* Misc settings */}
        <div className="col-span-3">
          <GlowCard className="h-full">
            <SectionLabel accent={C.green}>Engine Flags</SectionLabel>
            <div className="space-y-2">
              {[
                { k: 'Banner Grabbing', v: true, accent: C.cyan },
                { k: 'OS Fingerprint', v: true, accent: C.cyan },
                { k: 'Version Detection', v: true, accent: C.green },
                { k: 'Script Scan', v: false, accent: C.purple },
                { k: 'UDP Scan', v: false, accent: C.orange },
                { k: 'IPv6 Support', v: true, accent: C.cyan },
                { k: 'Rate Limit Aware', v: true, accent: C.yellow },
              ].map(({ k, v, accent }) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[9px] font-mono" style={{ color: C.text1 }}>
                    {k}
                  </span>
                  <Toggle value={v} onChange={() => {}} accent={accent} />
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        {/* Tool Integrations */}
        <div className="col-span-12">
          <GlowCard>
            <SectionLabel accent={C.purple}>Tool Integrations</SectionLabel>
            <div className="grid grid-cols-6 gap-1.5">
              {tools.map((t) => {
                const cc = CATEGORY_COLORS[t.category] ?? C.text2;
                return (
                  <div
                    key={t.name}
                    className="rounded p-2 transition-all cursor-pointer group"
                    style={{
                      background: t.status === 'active' ? `${cc}08` : C.bg3,
                      border: `1px solid ${t.status === 'active' ? cc + '30' : C.border}`,
                    }}
                    onClick={() =>
                      setTools((prev) =>
                        prev.map((pt) =>
                          pt.name === t.name
                            ? { ...pt, status: pt.status === 'active' ? 'inactive' : 'active' }
                            : pt,
                        ),
                      )
                    }
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className="text-[9px] font-bold font-mono"
                        style={{ color: t.status === 'active' ? cc : C.text3 }}
                      >
                        {t.name}
                      </span>
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: t.status === 'active' ? cc : C.text3 }}
                      />
                    </div>
                    <div className="text-[7.5px] font-mono" style={{ color: C.text3 }}>
                      v{t.version}
                    </div>
                    <div
                      className="text-[6.5px] font-mono mt-0.5 truncate"
                      style={{ color: C.text3 }}
                    >
                      {t.path}
                    </div>
                    <div
                      className="text-[7px] font-mono mt-1 px-1 py-px rounded inline-block"
                      style={{ background: `${cc}15`, color: cc, border: `1px solid ${cc}20` }}
                    >
                      {t.category}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: NOTIFICATIONS
// ============================================================================
function TabNotifications() {
  const [rules, setRules] = useState(NOTIFICATION_RULES);

  const CHANNEL_COLOR: Record<string, string> = {
    Telegram: C.cyan,
    Email: C.yellow,
    Slack: C.purple,
    Webhook: C.orange,
    'In-App': C.green,
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#04060a]">
      <div className="grid grid-cols-12 gap-2">
        {/* Alert rules */}
        <div className="col-span-8">
          <GlowCard accent={C.yellow}>
            <SectionLabel accent={C.yellow}>Alert Rules</SectionLabel>
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Event', 'Channel', 'Threshold', 'Active'].map((h) => (
                    <th
                      key={h}
                      className="text-left pb-1.5 pr-3 text-[8px] uppercase tracking-widest font-normal"
                      style={{ color: C.text3 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => {
                  const cc = CHANNEL_COLOR[r.channel] ?? C.text2;
                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}20` }}>
                      <td className="py-2 pr-3">
                        <span style={{ color: r.active ? C.text0 : C.text3 }}>{r.event}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge color={cc}>{r.channel}</Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <span style={{ color: C.text2 }}>{r.threshold}</span>
                      </td>
                      <td className="py-2">
                        <Toggle
                          value={r.active}
                          onChange={(v) =>
                            setRules((prev) =>
                              prev.map((pr) => (pr.id === r.id ? { ...pr, active: v } : pr)),
                            )
                          }
                          accent={C.yellow}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </GlowCard>
        </div>

        {/* Channel config */}
        <div className="col-span-4 flex flex-col gap-2">
          {[
            {
              channel: 'Telegram',
              color: C.cyan,
              fields: [
                { k: 'Bot Token', v: '6847382910:AAH...' },
                { k: 'Chat ID', v: '-1001847382910' },
              ],
            },
            {
              channel: 'Slack',
              color: C.purple,
              fields: [{ k: 'Webhook URL', v: 'https://hooks.slack.com/...' }],
            },
            {
              channel: 'Email',
              color: C.yellow,
              fields: [
                { k: 'SMTP Host', v: 'smtp.protonmail.ch' },
                { k: 'To', v: 'operator@proton.me' },
              ],
            },
          ].map((cfg) => (
            <GlowCard key={cfg.channel} accent={cfg.color}>
              <SectionLabel accent={cfg.color}>{cfg.channel}</SectionLabel>
              <div className="space-y-1.5">
                {cfg.fields.map((f) => (
                  <div key={f.k}>
                    <div className="text-[7.5px] font-mono mb-0.5" style={{ color: C.text3 }}>
                      {f.k}
                    </div>
                    <input
                      defaultValue={f.v}
                      className="w-full px-2 py-1 rounded text-[9px] font-mono outline-none"
                      style={{ background: C.bg3, border: `1px solid ${C.border}`, color: C.text1 }}
                    />
                  </div>
                ))}
                <button
                  className="w-full py-1 rounded text-[8px] font-bold font-mono uppercase"
                  style={{
                    background: `${cfg.color}10`,
                    border: `1px solid ${cfg.color}30`,
                    color: cfg.color,
                  }}
                >
                  Test Connection
                </button>
              </div>
            </GlowCard>
          ))}
        </div>

        {/* Alert Severity Matrix */}
        <div className="col-span-12">
          <GlowCard>
            <SectionLabel accent={C.red}>Alert Severity Matrix</SectionLabel>
            <div className="grid grid-cols-4 gap-2">
              {[
                {
                  sev: 'CRITICAL',
                  color: C.red,
                  events: ['RCE CVE', 'Credential Leak', 'Dark Web Sale'],
                  always: true,
                },
                {
                  sev: 'HIGH',
                  color: C.orange,
                  events: ['New Open Port', 'Subdomain Takeover', 'API Breach'],
                  always: true,
                },
                {
                  sev: 'MEDIUM',
                  color: C.yellow,
                  events: ['SSL Expiry', 'New Subdomain', 'Policy Violation'],
                  always: false,
                },
                {
                  sev: 'LOW',
                  color: C.green,
                  events: ['Scan Complete', 'TOR Rotate', 'API Quota'],
                  always: false,
                },
              ].map(({ sev, color, events, always }) => (
                <div
                  key={sev}
                  className="rounded p-2.5"
                  style={{ background: `${color}06`, border: `1px solid ${color}25` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge color={color}>{sev}</Badge>
                    {always && (
                      <span className="text-[7px] font-mono" style={{ color: C.text3 }}>
                        ALWAYS ALERT
                      </span>
                    )}
                  </div>
                  {events.map((e) => (
                    <div key={e} className="flex items-center gap-1.5 py-0.5">
                      <div
                        className="w-1 h-1 rounded-full shrink-0"
                        style={{ background: color }}
                      />
                      <span className="text-[8.5px] font-mono" style={{ color: C.text2 }}>
                        {e}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: SECURITY
// ============================================================================
function TabSecurity() {
  const [twoFA, setTwoFA] = useState(true);
  const [sessionLock, setSessionLock] = useState(true);
  const [auditLog, setAuditLog] = useState(true);
  const [encryptStorage, setEncryptStorage] = useState(true);
  const [autoWipe, setAutoWipe] = useState(false);

  const SecurityScore = () => {
    const checks = [twoFA, sessionLock, auditLog, encryptStorage];
    const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    const color = score >= 80 ? C.green : score >= 60 ? C.yellow : C.red;
    const r = 40,
      circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;
    return (
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 100 100" className="w-24 h-24">
          <circle cx="50" cy="50" r={r} fill="none" stroke={C.bg3} strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
          <text
            x="50"
            y="46"
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill={color}
            fontFamily="monospace"
          >
            {score}
          </text>
          <text
            x="50"
            y="60"
            textAnchor="middle"
            fontSize="7"
            fill={C.text3}
            fontFamily="monospace"
          >
            OPSEC
          </text>
        </svg>
        <div className="text-[9px] font-mono" style={{ color }}>
          {score >= 80 ? '✓ Hardened' : score >= 60 ? '⚠ Fair' : '✗ Exposed'}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#04060a]">
      <div className="grid grid-cols-12 gap-2">
        {/* OPSEC Score */}
        <div className="col-span-3">
          <GlowCard accent={C.green} className="h-full flex flex-col items-center justify-center">
            <SectionLabel accent={C.green}>OPSEC Score</SectionLabel>
            <SecurityScore />
            <div className="mt-2 w-full space-y-1">
              {[
                { k: '2FA Enabled', v: twoFA },
                { k: 'Session Lock', v: sessionLock },
                { k: 'Audit Logging', v: auditLog },
                { k: 'Encrypted Storage', v: encryptStorage },
              ].map(({ k, v }) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-[8px] font-mono" style={{ color: v ? C.green : C.red }}>
                    {v ? '✓' : '✗'}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: v ? C.text1 : C.text3 }}>
                    {k}
                  </span>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        {/* Auth settings */}
        <div className="col-span-5 flex flex-col gap-2">
          <GlowCard accent={C.purple}>
            <SectionLabel accent={C.purple}>Authentication</SectionLabel>
            <div className="space-y-2">
              {[
                { k: 'Two-Factor Auth (TOTP)', v: twoFA, setter: setTwoFA, accent: C.green },
                {
                  k: 'Session Lock (5 min idle)',
                  v: sessionLock,
                  setter: setSessionLock,
                  accent: C.yellow,
                },
                { k: 'Audit Log All Actions', v: auditLog, setter: setAuditLog, accent: C.cyan },
              ].map(({ k, v, setter, accent }) => (
                <div
                  key={k}
                  className="flex items-center justify-between py-1.5 border-b"
                  style={{ borderColor: C.border }}
                >
                  <span className="text-[10px] font-mono" style={{ color: C.text1 }}>
                    {k}
                  </span>
                  <Toggle value={v} onChange={setter} accent={accent} />
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                className="py-1.5 rounded text-[8px] font-bold font-mono uppercase"
                style={{
                  background: `${C.purple}15`,
                  border: `1px solid ${C.purple}40`,
                  color: C.purple,
                }}
              >
                View TOTP QR
              </button>
              <button
                className="py-1.5 rounded text-[8px] font-bold font-mono uppercase"
                style={{
                  background: `${C.cyan}10`,
                  border: `1px solid ${C.cyan}30`,
                  color: C.cyan,
                }}
              >
                Regen Backup Codes
              </button>
            </div>
          </GlowCard>

          <GlowCard accent={C.cyan}>
            <SectionLabel accent={C.cyan}>Encryption</SectionLabel>
            <div className="space-y-2">
              {[
                {
                  k: 'Encrypt Storage at Rest',
                  v: encryptStorage,
                  setter: setEncryptStorage,
                  accent: C.cyan,
                },
                {
                  k: 'Auto-wipe on 5 failed logins',
                  v: autoWipe,
                  setter: setAutoWipe,
                  accent: C.red,
                },
              ].map(({ k, v, setter, accent }) => (
                <div
                  key={k}
                  className="flex items-center justify-between py-1.5 border-b"
                  style={{ borderColor: C.border }}
                >
                  <span className="text-[10px] font-mono" style={{ color: C.text1 }}>
                    {k}
                  </span>
                  <Toggle value={v} onChange={setter} accent={accent} />
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[8.5px] font-mono">
                <span style={{ color: C.text3 }}>Cipher</span>
                <span style={{ color: C.cyan }}>AES-256-GCM</span>
              </div>
              <div className="flex justify-between text-[8.5px] font-mono">
                <span style={{ color: C.text3 }}>KDF</span>
                <span style={{ color: C.cyan }}>Argon2id</span>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* PGP Key manager */}
        <div className="col-span-4">
          <GlowCard accent={C.orange} className="h-full">
            <SectionLabel accent={C.orange}>PGP Key Management</SectionLabel>
            <div
              className="rounded p-2 mb-2 text-[8px] font-mono leading-relaxed"
              style={{ background: C.bg3, border: `1px solid ${C.border}`, color: C.text2 }}
            >
              -----BEGIN PUBLIC KEY-----
              <br />
              mQINBGRy4gkBEADLsZby3PqI1XmF...
              <br />
              <span style={{ color: C.text3 }}>... (RSA 4096) ...</span>
              <br />
              -----END PUBLIC KEY-----
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[8.5px] font-mono">
                <span style={{ color: C.text3 }}>Algorithm</span>
                <span style={{ color: C.orange }}>RSA-4096</span>
              </div>
              <div className="flex justify-between text-[8.5px] font-mono">
                <span style={{ color: C.text3 }}>Fingerprint</span>
                <span style={{ color: C.text1 }}>{OPERATOR_PROFILE.keyFingerprint}</span>
              </div>
              <div className="flex justify-between text-[8.5px] font-mono">
                <span style={{ color: C.text3 }}>Uploaded to</span>
                <span style={{ color: C.cyan }}>keys.openpgp.org</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {['Import Key', 'Export Key', 'Rotate Key', 'Revoke'].map((action, i) => (
                <button
                  key={action}
                  className="py-1.5 rounded text-[8px] font-bold font-mono uppercase"
                  style={{
                    background: i === 3 ? `${C.red}10` : `${C.orange}10`,
                    border: `1px solid ${i === 3 ? C.red + '30' : C.orange + '30'}`,
                    color: i === 3 ? C.red : C.orange,
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          </GlowCard>
        </div>

        {/* Active sessions */}
        <div className="col-span-12">
          <GlowCard>
            <SectionLabel accent={C.red}>Active Sessions</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  device: 'Ghost Terminal v2',
                  os: 'Kali Linux 2025.1',
                  ip: '127.0.0.1',
                  location: 'Localhost · TOR',
                  since: '03:15 UTC',
                  current: true,
                },
                {
                  device: 'Burner Laptop',
                  os: 'Tails 6.3',
                  ip: '10.8.0.2',
                  location: 'VPN · DE',
                  since: 'Yesterday 22:40',
                  current: false,
                },
                {
                  device: 'Mobile (Encrypted)',
                  os: 'GrapheneOS 2025',
                  ip: '172.16.0.3',
                  location: 'TOR · NL',
                  since: '2 days ago',
                  current: false,
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded p-2.5"
                  style={{
                    background: s.current ? `${C.green}06` : C.bg3,
                    border: `1px solid ${s.current ? C.green + '30' : C.border}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[10px] font-bold font-mono"
                      style={{ color: s.current ? C.green : C.text1 }}
                    >
                      {s.device}
                    </span>
                    {s.current ? (
                      <Badge color={C.green} dot>
                        CURRENT
                      </Badge>
                    ) : (
                      <button className="text-[8px] font-mono" style={{ color: C.red }}>
                        REVOKE
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {[
                      { k: 'OS', v: s.os },
                      { k: 'IP', v: s.ip },
                      { k: 'Location', v: s.location },
                      { k: 'Since', v: s.since },
                    ].map(({ k, v }) => (
                      <div key={k} className="flex justify-between text-[8.5px] font-mono">
                        <span style={{ color: C.text3 }}>{k}</span>
                        <span style={{ color: C.text2 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: SERVER
// ============================================================================
function TabServer() {
  const [url, setUrl] = useState(() => localStorage.getItem('phantoma_server_url') ?? 'http://localhost:8080');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  const handleSave = () => {
    localStorage.setItem('phantoma_server_url', url.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult('idle');
    setTestMsg('');
    try {
      const res = await fetch(url.trim().replace(/\/$/, '') + '/health', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const json = await res.json();
        setTestResult('ok');
        setTestMsg(`${json?.data?.service ?? 'server'} · ${res.status} OK`);
      } else {
        setTestResult('error');
        setTestMsg(`HTTP ${res.status} ${res.statusText}`);
      }
    } catch (e: unknown) {
      setTestResult('error');
      setTestMsg(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const statusColor = testResult === 'ok' ? C.green : testResult === 'error' ? C.red : C.text3;

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#04060a]">
      <div className="max-w-2xl mx-auto flex flex-col gap-3">

        {/* Main config card */}
        <GlowCard accent={C.cyan}>
          <SectionLabel accent={C.cyan}>Backend Server Connection</SectionLabel>

          <div className="space-y-4 mt-1">
            {/* URL input */}
            <div>
              <label
                className="block text-[9px] font-bold tracking-[0.12em] uppercase font-mono mb-1.5"
                style={{ color: C.text2 }}
              >
                Server URL
              </label>
              <div className="relative flex items-center">
                {/* prefix icon */}
                <div
                  className="absolute left-3 text-[11px] font-mono select-none"
                  style={{ color: C.cyan + '80' }}
                >
                  ⬡
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setTestResult('idle');
                  }}
                  placeholder="http://localhost:8080"
                  spellCheck={false}
                  className="w-full pl-8 pr-4 py-2 rounded text-[11px] font-mono tracking-wider outline-none transition-all"
                  style={{
                    background: C.bg3,
                    border: `1px solid ${testResult === 'error' ? C.red + '80' : testResult === 'ok' ? C.green + '60' : C.border}`,
                    color: C.text0,
                    caretColor: C.cyan,
                    boxShadow: testResult === 'ok' ? `0 0 0 1px ${C.green}30` : testResult === 'error' ? `0 0 0 1px ${C.red}20` : undefined,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = C.cyan + '80')}
                  onBlur={(e) => (e.target.style.borderColor = testResult === 'error' ? C.red + '80' : testResult === 'ok' ? C.green + '60' : C.border)}
                />
              </div>
              <p className="mt-1 text-[8px] font-mono" style={{ color: C.text3 }}>
                URL của Phantoma Go backend server. Mặc định: http://localhost:8080
              </p>
            </div>

            {/* Test result banner */}
            {testResult !== 'idle' && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded text-[9px] font-mono"
                style={{
                  background: `${statusColor}10`,
                  border: `1px solid ${statusColor}30`,
                  color: statusColor,
                }}
              >
                <span>{testResult === 'ok' ? '✓' : '✗'}</span>
                <span>{testMsg}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {/* Test Connection */}
              <button
                onClick={handleTest}
                disabled={testing || !url.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded text-[9px] font-bold font-mono uppercase tracking-widest transition-all disabled:opacity-40"
                style={{
                  background: `${C.purple}15`,
                  border: `1px solid ${C.purple}50`,
                  color: C.purple,
                }}
              >
                {testing ? (
                  <>
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin"
                    />
                    Testing...
                  </>
                ) : (
                  <>⬡ Test Connection</>
                )}
              </button>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={!url.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded text-[9px] font-bold font-mono uppercase tracking-widest transition-all disabled:opacity-40"
                style={{
                  background: saved ? `${C.green}20` : `${C.cyan}15`,
                  border: `1px solid ${saved ? C.green : C.cyan}50`,
                  color: saved ? C.green : C.cyan,
                }}
              >
                {saved ? '✓ Saved' : '⊙ Save'}
              </button>
            </div>
          </div>
        </GlowCard>

        {/* Info card */}
        <GlowCard>
          <SectionLabel accent={C.text3}>Endpoints</SectionLabel>
          <div className="space-y-1">
            {[
              { method: 'GET',  path: '/health',            desc: 'Server health check' },
              { method: 'POST', path: '/api/v1/nmap/scan',  desc: 'Nmap network scan' },
              { method: 'POST', path: '/api/v1/nikto/scan', desc: 'Nikto web vulnerability scan' },
            ].map(({ method, path, desc }) => (
              <div
                key={path}
                className="flex items-center gap-3 px-2 py-1.5 rounded"
                style={{ background: C.bg3, border: `1px solid ${C.border}` }}
              >
                <span
                  className="text-[8px] font-bold font-mono w-9 shrink-0"
                  style={{ color: method === 'GET' ? C.green : C.cyan }}
                >
                  {method}
                </span>
                <span className="text-[9px] font-mono flex-1" style={{ color: C.text1 }}>
                  {path}
                </span>
                <span className="text-[8px] font-mono" style={{ color: C.text3 }}>
                  {desc}
                </span>
              </div>
            ))}
          </div>
        </GlowCard>

      </div>
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================
const TABS = [
  { id: 'operator',     label: 'Operator',    icon: '◈', accent: C.cyan   },
  { id: 'server',       label: 'Server',      icon: '⬡', accent: C.cyan   },
  { id: 'network',      label: 'Network',     icon: '⬡', accent: C.purple },
  { id: 'apikeys',      label: 'API Keys',    icon: '⌗', accent: C.green  },
  { id: 'scanengine',   label: 'Scan Engine', icon: '⊙', accent: C.orange },
  { id: 'notifications',label: 'Alerts',      icon: '⊛', accent: C.yellow },
  { id: 'security',     label: 'Security',    icon: '⊕', accent: C.red    },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function Setting() {
  const [active, setActive] = useState<TabId>('operator');
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const renderContent = () => {
    switch (active) {
      case 'operator':
        return <TabOperator />;
      case 'server':
        return <TabServer />;
      case 'network':
        return <TabNetwork />;
      case 'apikeys':
        return <TabAPIKeys />;
      case 'scanengine':
        return <TabScanEngine />;
      case 'notifications':
        return <TabNotifications />;
      case 'security':
        return <TabSecurity />;
      default:
        return null;
    }
  };

  const activeTab = TABS.find((t) => t.id === active)!;

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{
        background: C.bg0,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace',
      }}
    >
      {/* ── Header Bar ── */}
      <div
        className="flex items-center h-[34px] shrink-0 px-3 gap-0"
        style={{
          background: C.bg1,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {/* Left: label */}
        <div className="flex items-center gap-2 mr-4 shrink-0">
          <div className="w-px h-3 rounded-full" style={{ background: activeTab.accent }} />
          <span
            className="text-[10px] font-bold tracking-[0.12em] uppercase"
            style={{ color: activeTab.accent + 'bb' }}
          >
            Settings
          </span>
        </div>

        {/* Tabs */}
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className="h-full px-3 text-[9px] uppercase tracking-[0.1em] font-bold transition-all relative whitespace-nowrap flex items-center gap-1.5"
            style={{ color: active === tab.id ? C.text0 : C.text3 }}
          >
            <span style={{ color: active === tab.id ? tab.accent : C.text3, fontSize: '10px' }}>
              {tab.icon}
            </span>
            {tab.label}
            {active === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{
                  background: `linear-gradient(to right, transparent, ${tab.accent}, transparent)`,
                }}
              />
            )}
          </button>
        ))}

        {/* Right: status */}
        <div className="ml-auto flex items-center gap-3">
          {/* TOR status */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: C.purple, boxShadow: `0 0 4px ${C.purple}` }}
            />
            <span className="text-[8.5px] font-mono" style={{ color: C.text3 }}>
              TOR
            </span>
          </div>

          <div className="w-px h-3" style={{ background: C.border }} />

          {/* Clock */}
          <span className="text-[9px] font-mono tabular-nums" style={{ color: C.text3 }}>
            {clock.toISOString().slice(11, 19)} UTC
          </span>

          <div className="w-px h-3" style={{ background: C.border }} />

          {/* Operator badge */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: `${C.cyan}20`, border: `1px solid ${C.cyan}40`, color: C.cyan }}
            >
              {OPERATOR_PROFILE.avatar}
            </div>
            <span className="text-[9px] font-mono" style={{ color: C.text2 }}>
              {OPERATOR_PROFILE.callsign}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {renderContent()}
    </div>
  );
}
