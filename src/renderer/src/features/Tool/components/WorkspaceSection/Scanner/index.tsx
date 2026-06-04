// src/renderer/src/features/Tool/components/WorkspaceSection/Scanner/index.tsx
// ============================================================================
// NETWORK SCANNER — Ghost Recon Engine
// Aesthetic: Terminal-noir / Tactical Recon Interface
// ============================================================================
import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../../shared/lib/utils';

// ============================================================================
// TYPES
// ============================================================================
type PortStatus = 'open' | 'filtered' | 'closed' | 'vuln';

interface PortDetail {
  number: number;
  service: string;
  product?: string;
  version?: string;
  status: PortStatus;
  cve?: string[];
  banner?: string;
  proto?: 'tcp' | 'udp';
}

interface ScriptOutput {
  id: string;
  output: string;
  risk: 'info' | 'warning' | 'vulnerable';
}

interface VulnSummary {
  cve: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  port: number;
  cvss?: number;
  exploit?: boolean;
}

interface HostDetail {
  ip: string;
  hostname: string;
  os: string;
  osAccuracy: number;
  mac?: string;
  vendor?: string;
  uptime?: string;
  lastBoot?: string;
  ttl?: number;
  ports: PortDetail[];
  scripts?: ScriptOutput[];
  traceroute?: string[];
  vulns?: VulnSummary[];
  riskScore?: number;
}

// ============================================================================
// MOCK DATA
// ============================================================================
const mockHosts: HostDetail[] = [
  {
    ip: '192.168.1.1',
    hostname: 'gateway.local',
    os: 'Linux · OpenWrt',
    osAccuracy: 92,
    mac: '00:1A:2B:3C:4D:5E',
    vendor: 'TP-Link',
    uptime: '14d 3h',
    lastBoot: '2025-05-19 08:00',
    ttl: 64,
    riskScore: 28,
    ports: [
      {
        number: 22,
        service: 'ssh',
        product: 'Dropbear',
        version: '2022.82',
        status: 'open',
        proto: 'tcp',
        banner: 'SSH-2.0-dropbear_2022.82',
      },
      {
        number: 53,
        service: 'dns',
        product: 'dnsmasq',
        version: '2.85',
        status: 'open',
        proto: 'udp',
        banner: 'DNS server',
      },
      {
        number: 80,
        service: 'http',
        product: 'uhttpd',
        version: '1.0',
        status: 'open',
        proto: 'tcp',
        banner: 'HTTP/1.1 200 OK',
      },
      {
        number: 443,
        service: 'https',
        product: 'uhttpd',
        version: '1.0',
        status: 'open',
        proto: 'tcp',
        banner: 'TLS 1.2',
      },
      {
        number: 1900,
        service: 'upnp',
        product: 'MiniUPnPd',
        version: '2.1',
        status: 'open',
        proto: 'udp',
      },
    ],
    scripts: [
      { id: 'http-title', output: 'OpenWrt LuCI Admin Panel', risk: 'info' },
      { id: 'ssh-hostkey', output: 'RSA 2048 · 2b:3c:4d:5e:6f:7a', risk: 'info' },
      { id: 'upnp-info', output: 'UPnP enabled — possible NAT traversal', risk: 'warning' },
    ],
    traceroute: ['192.168.1.1', '10.0.0.1', '—'],
    vulns: [],
  },
  {
    ip: '192.168.1.10',
    hostname: 'dc01.corp.local',
    os: 'Windows Server 2019',
    osAccuracy: 98,
    mac: '00:50:56:A1:B2:C3',
    vendor: 'VMware',
    uptime: '67d 12h',
    lastBoot: '2025-03-27 15:30',
    ttl: 128,
    riskScore: 97,
    ports: [
      {
        number: 88,
        service: 'kerberos',
        product: 'MS Kerberos',
        version: '10.0',
        status: 'vuln',
        proto: 'tcp',
        cve: ['CVE-2021-42282'],
        banner: 'Kerberos 5',
      },
      {
        number: 135,
        service: 'msrpc',
        product: 'MS RPC',
        version: '10.0',
        status: 'open',
        proto: 'tcp',
      },
      {
        number: 139,
        service: 'netbios',
        product: 'Samba',
        version: '3.0',
        status: 'open',
        proto: 'tcp',
      },
      {
        number: 389,
        service: 'ldap',
        product: 'MS AD LDAP',
        version: '10.0',
        status: 'open',
        proto: 'tcp',
        banner: 'LDAP server',
      },
      {
        number: 445,
        service: 'smb',
        product: 'MS SMB',
        version: '3.1.1',
        status: 'vuln',
        proto: 'tcp',
        cve: ['MS17-010', 'CVE-2020-0796'],
        banner: 'SMBv3',
      },
      {
        number: 3389,
        service: 'rdp',
        product: 'MS RDP',
        version: '10.0',
        status: 'open',
        proto: 'tcp',
        banner: 'RDP 8.0',
      },
      {
        number: 5985,
        service: 'winrm',
        product: 'MS WinRM',
        version: '3.0',
        status: 'open',
        proto: 'tcp',
      },
    ],
    scripts: [
      {
        id: 'smb-vuln-ms17-010',
        output: 'VULNERABLE: EternalBlue — Remote Code Execution',
        risk: 'vulnerable',
      },
      { id: 'smb-os-discovery', output: 'Windows Server 2019 Standard 17763', risk: 'info' },
      { id: 'ldap-rootdse', output: 'defaultNamingContext: DC=corp,DC=local', risk: 'info' },
      {
        id: 'rdp-enum-encryption',
        output: 'NLA disabled — credential exposure risk',
        risk: 'warning',
      },
    ],
    traceroute: ['192.168.1.1', '192.168.1.10'],
    vulns: [
      {
        cve: 'MS17-010',
        severity: 'CRITICAL',
        description: 'EternalBlue SMB RCE',
        port: 445,
        cvss: 9.8,
        exploit: true,
      },
      {
        cve: 'CVE-2020-0796',
        severity: 'CRITICAL',
        description: 'SMBGhost — unauthenticated RCE',
        port: 445,
        cvss: 10.0,
        exploit: true,
      },
      {
        cve: 'CVE-2021-42282',
        severity: 'HIGH',
        description: 'Kerberos elevation of privilege',
        port: 88,
        cvss: 7.5,
        exploit: false,
      },
    ],
  },
  {
    ip: '192.168.1.20',
    hostname: 'web01.corp.local',
    os: 'Ubuntu 22.04 LTS',
    osAccuracy: 95,
    mac: '08:00:27:AB:CD:EF',
    vendor: 'VirtualBox',
    uptime: '3d 2h',
    lastBoot: '2025-05-30 18:45',
    ttl: 64,
    riskScore: 84,
    ports: [
      {
        number: 22,
        service: 'ssh',
        product: 'OpenSSH',
        version: '8.9p1',
        status: 'open',
        proto: 'tcp',
        cve: ['CVE-2023-38408'],
        banner: 'SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.4',
      },
      {
        number: 80,
        service: 'http',
        product: 'nginx',
        version: '1.24.0',
        status: 'open',
        proto: 'tcp',
        banner: 'nginx/1.24.0',
      },
      {
        number: 443,
        service: 'https',
        product: 'nginx',
        version: '1.24.0',
        status: 'open',
        proto: 'tcp',
        banner: 'TLS 1.3',
      },
      {
        number: 3306,
        service: 'mysql',
        product: 'MySQL',
        version: '8.0.33',
        status: 'vuln',
        proto: 'tcp',
        cve: ['CVE-2023-2182'],
        banner: 'mysql_native_password',
      },
      {
        number: 8080,
        service: 'http-alt',
        product: 'Jenkins',
        version: '2.401.1',
        status: 'vuln',
        proto: 'tcp',
        cve: ['CVE-2023-27898'],
        banner: 'Jenkins CI',
      },
      {
        number: 9200,
        service: 'elasticsearch',
        product: 'Elasticsearch',
        version: '8.8.0',
        status: 'filtered',
        proto: 'tcp',
      },
    ],
    scripts: [
      { id: 'http-title', output: 'Welcome to nginx!', risk: 'info' },
      {
        id: 'mysql-empty-password',
        output: 'Anonymous login allowed — no auth required',
        risk: 'vulnerable',
      },
      {
        id: 'http-jenkins-version',
        output: 'Jenkins 2.401.1 — CVE-2023-27898 auth bypass',
        risk: 'vulnerable',
      },
      { id: 'http-methods', output: 'Allowed: GET HEAD POST OPTIONS PUT DELETE', risk: 'warning' },
    ],
    traceroute: ['192.168.1.1', '192.168.1.20'],
    vulns: [
      {
        cve: 'CVE-2023-27898',
        severity: 'CRITICAL',
        description: 'Jenkins auth bypass RCE',
        port: 8080,
        cvss: 9.8,
        exploit: true,
      },
      {
        cve: 'CVE-2023-38408',
        severity: 'HIGH',
        description: 'OpenSSH Remote Code Execution',
        port: 22,
        cvss: 7.8,
        exploit: false,
      },
      {
        cve: 'CVE-2023-2182',
        severity: 'MEDIUM',
        description: 'MySQL Denial of Service',
        port: 3306,
        cvss: 5.5,
        exploit: false,
      },
    ],
  },
  {
    ip: '192.168.1.30',
    hostname: '—',
    os: 'Unknown · likely IoT',
    osAccuracy: 45,
    mac: 'AC:DE:48:12:34:56',
    vendor: 'Raspberry Pi',
    uptime: '0d 18h',
    lastBoot: '2025-06-01 06:00',
    ttl: 64,
    riskScore: 76,
    ports: [
      {
        number: 21,
        service: 'ftp',
        product: 'vsftpd',
        version: '3.0.5',
        status: 'open',
        proto: 'tcp',
        cve: ['CVE-2015-1419'],
        banner: '220 Welcome',
      },
      {
        number: 23,
        service: 'telnet',
        product: 'busybox telnetd',
        version: '1.33.2',
        status: 'vuln',
        proto: 'tcp',
        cve: ['CVE-2022-30065'],
        banner: 'login:',
      },
      {
        number: 8080,
        service: 'http',
        product: 'lighttpd',
        version: '1.4.69',
        status: 'open',
        proto: 'tcp',
        banner: 'HTTP/1.1 200 OK',
      },
    ],
    scripts: [
      { id: 'ftp-anon', output: 'Anonymous FTP login allowed', risk: 'vulnerable' },
      { id: 'telnet-brute', output: 'Default credentials found: admin:admin', risk: 'vulnerable' },
    ],
    traceroute: ['192.168.1.1', '192.168.1.30'],
    vulns: [
      {
        cve: 'CVE-2022-30065',
        severity: 'HIGH',
        description: 'BusyBox telnetd RCE',
        port: 23,
        cvss: 7.8,
        exploit: true,
      },
    ],
  },
  {
    ip: '192.168.1.50',
    hostname: 'mail.corp.local',
    os: 'Debian 11 (bullseye)',
    osAccuracy: 88,
    mac: '00:50:56:A1:D2:E3',
    vendor: 'VMware',
    uptime: '32d 10h',
    lastBoot: '2025-04-30 20:00',
    ttl: 64,
    riskScore: 18,
    ports: [
      {
        number: 25,
        service: 'smtp',
        product: 'Postfix',
        version: '3.5.18',
        status: 'open',
        proto: 'tcp',
        banner: '220 mail.corp.local ESMTP Postfix',
      },
      {
        number: 110,
        service: 'pop3',
        product: 'Dovecot',
        version: '2.3.13',
        status: 'open',
        proto: 'tcp',
        banner: '+OK Dovecot ready',
      },
      {
        number: 143,
        service: 'imap',
        product: 'Dovecot',
        version: '2.3.13',
        status: 'open',
        proto: 'tcp',
        banner: '* OK [CAPABILITY IMAP4rev1]',
      },
      {
        number: 587,
        service: 'submission',
        product: 'Postfix',
        version: '3.5.18',
        status: 'open',
        proto: 'tcp',
        banner: '220 mail.corp.local ESMTP',
      },
      {
        number: 993,
        service: 'imaps',
        product: 'Dovecot',
        version: '2.3.13',
        status: 'open',
        proto: 'tcp',
        banner: 'TLS 1.3',
      },
    ],
    scripts: [
      { id: 'smtp-commands', output: 'HELP EHLO STARTTLS AUTH PLAIN LOGIN', risk: 'info' },
      { id: 'smtp-open-relay', output: 'Not an open relay', risk: 'info' },
    ],
    traceroute: ['192.168.1.1', '192.168.1.50'],
    vulns: [],
  },
];

const SCAN_LOGS = [
  { ts: '09:14:32', level: 'info', msg: 'Nmap 7.95 — Starting scan 192.168.1.0/24 — 256 hosts' },
  { ts: '09:14:33', level: 'host', msg: '192.168.1.1 — Up (0.35ms latency) · TP-Link' },
  { ts: '09:14:34', level: 'port', msg: '22/tcp open  ssh     Dropbear 2022.82' },
  { ts: '09:14:34', level: 'port', msg: '80/tcp open  http    uhttpd 1.0' },
  { ts: '09:14:35', level: 'host', msg: '192.168.1.10 — Up (0.89ms latency) · VMware' },
  { ts: '09:14:35', level: 'warn', msg: 'SMB signing disabled on 192.168.1.10' },
  { ts: '09:14:36', level: 'vuln', msg: '445/tcp — EternalBlue (MS17-010) VULNERABLE' },
  { ts: '09:14:36', level: 'vuln', msg: '445/tcp — SMBGhost (CVE-2020-0796) VULNERABLE' },
  { ts: '09:14:37', level: 'host', msg: '192.168.1.20 — Up (0.62ms latency) · VirtualBox' },
  { ts: '09:14:37', level: 'port', msg: '8080/tcp open http-alt  Jenkins 2.401.1' },
  { ts: '09:14:38', level: 'vuln', msg: '8080/tcp — Jenkins CVE-2023-27898 auth bypass' },
  { ts: '09:14:38', level: 'vuln', msg: '3306/tcp — MySQL anonymous login allowed' },
  { ts: '09:14:39', level: 'host', msg: '192.168.1.30 — Up (1.2ms latency) · Raspberry Pi' },
  { ts: '09:14:39', level: 'vuln', msg: '23/tcp — telnet default creds: admin:admin' },
  {
    ts: '09:14:40',
    level: 'info',
    msg: 'OS detection: 192.168.1.10 — Windows Server 2019 (TTL 128)',
  },
  { ts: '09:14:41', level: 'info', msg: 'Scanning 192.168.1.40-80 …' },
  { ts: '09:14:42', level: 'host', msg: '192.168.1.50 — Up (0.55ms latency) · VMware' },
  { ts: '09:14:43', level: 'info', msg: 'RTT: min=0.3ms avg=0.9ms max=14ms' },
];

// ============================================================================
// CONSTANTS
// ============================================================================
const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#ff2d55',
  HIGH: '#f5a623',
  MEDIUM: '#bf5af2',
  LOW: '#0af',
};

const PORT_STATUS_STYLE: Record<PortStatus, { color: string; bg: string; border: string }> = {
  open: { color: '#30d158', bg: '#30d15810', border: '#30d15828' },
  filtered: { color: '#f5a623', bg: '#f5a62310', border: '#f5a62328' },
  closed: { color: '#3a4558', bg: '#3a455810', border: '#3a455828' },
  vuln: { color: '#ff2d55', bg: '#ff2d5512', border: '#ff2d5535' },
};

const LOG_COLOR: Record<string, string> = {
  vuln: '#ff2d55',
  warn: '#f5a623',
  host: '#30d158',
  port: '#0af',
  info: '#3a4558',
};

// Risk score → color
const riskColor = (score: number) => {
  if (score >= 80) return '#ff2d55';
  if (score >= 50) return '#f5a623';
  if (score >= 25) return '#bf5af2';
  return '#30d158';
};

// ============================================================================
// SHARED UI
// ============================================================================
function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  const c = color ?? '#3a4558';
  return (
    <span
      className="text-[8px] font-mono px-1 py-[1px] rounded"
      style={{ color: c, background: `${c}18`, border: `1px solid ${c}30` }}
    >
      {children}
    </span>
  );
}

function SevBadge({ level }: { level: string }) {
  const c = SEV_COLOR[level] ?? '#636366';
  return (
    <span
      className="text-[8px] font-bold font-mono px-1.5 py-[1px] rounded uppercase tracking-wider"
      style={{ color: c, background: `${c}18`, border: `1px solid ${c}35` }}
    >
      {level}
    </span>
  );
}

function PortPill({ port }: { port: PortDetail }) {
  const s = PORT_STATUS_STYLE[port.status];
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-[2px] rounded font-mono text-[8.5px] font-bold"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
      title={`${port.service}${port.version ? ' ' + port.version : ''}`}
    >
      {port.number}
      {port.status === 'vuln' && <span className="text-[7px]">⚠</span>}
    </div>
  );
}

function KV({ k, v, vc }: { k: string; v: string; vc?: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-[3px] border-b border-[#111827] last:border-0">
      <span className="text-[9px] text-[#2a3548] font-mono shrink-0">{k}</span>
      <span className={cn('text-[9px] font-mono text-right break-all', vc ?? 'text-[#6a7a9a]')}>
        {v}
      </span>
    </div>
  );
}

function Card({
  children,
  className,
  accent,
  title,
  titleAccent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string;
  title?: string;
  titleAccent?: string;
}) {
  return (
    <div
      className={cn('bg-[#0d1017] border border-[#1c2333] rounded', className)}
      style={accent ? { borderColor: `${accent}28` } : undefined}
    >
      {title && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#1c2333]">
          <div
            className="w-[3px] h-3 rounded-full"
            style={{ background: titleAccent ?? accent ?? '#0af' }}
          />
          <span className="text-[9px] font-bold tracking-[0.1em] uppercase font-mono text-[#3a4558]">
            {title}
          </span>
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}

// Mini sparkline
function Sparkline({
  data,
  color = '#0af',
  h = 20,
}: {
  data: number[];
  color?: string;
  h?: number;
}) {
  const max = Math.max(...data, 1);
  const w = 100;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 2)}`)
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      style={{ height: h }}
      preserveAspectRatio="none"
    >
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`${color}18`} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

// Risk ring
function RiskRing({ score, size = 40 }: { score: number; size?: number }) {
  const color = riskColor(score);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const cx = size / 2,
    cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111827" strokeWidth="4" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ / 4}
        transform={`rotate(-90 ${cx} ${cy})`}
        strokeLinecap="round"
      />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="9"
        fontWeight="bold"
        fill={color}
        fontFamily="monospace"
      >
        {score}
      </text>
    </svg>
  );
}

// ============================================================================
// HOST CARD (list item)
// ============================================================================
function HostCard({
  host,
  selected,
  onClick,
}: {
  host: HostDetail;
  selected: boolean;
  onClick: () => void;
}) {
  const vulnCount = (host.vulns ?? []).length;
  const critCount = (host.vulns ?? []).filter((v) => v.severity === 'CRITICAL').length;
  const rc = riskColor(host.riskScore ?? 0);

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded border cursor-pointer transition-all p-2.5',
        selected
          ? 'bg-[#0af08] border-[#0af30]'
          : 'bg-[#0d1017] border-[#1c2333] hover:bg-[#111827] hover:border-[#2a3548]',
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <RiskRing score={host.riskScore ?? 0} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] font-bold font-mono text-[#0af]">{host.ip}</span>
            <span className="text-[8.5px] font-mono text-[#2a3548] truncate">{host.hostname}</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Tag color="#bf5af2">{host.os}</Tag>
            <Tag color="#3a4558">TTL:{host.ttl}</Tag>
            {vulnCount > 0 && <Tag color="#ff2d55">{critCount} critical</Tag>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[8px] font-mono text-[#2a3548]">{host.ports.length} ports</div>
          <div className="text-[8px] font-mono text-[#2a3548]">{host.uptime}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {host.ports.map((p) => (
          <PortPill key={p.number} port={p} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SCAN LOG
// ============================================================================
function ScanLog() {
  const [lines, setLines] = useState(SCAN_LOGS.slice(0, 10));
  const [idx, setIdx] = useState(10);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (idx >= SCAN_LOGS.length) return;
    const t = setTimeout(
      () => {
        setLines((prev) => [...prev, SCAN_LOGS[idx]]);
        setIdx((i) => i + 1);
      },
      500 + Math.random() * 500,
    );
    return () => clearTimeout(t);
  }, [idx]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden border-l border-[#1c2333]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#060810] border-b border-[#1c2333] shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
        <span className="text-[9px] font-bold font-mono text-[#30d158]">SCANNING</span>
        <span className="text-[9px] font-mono text-[#2a3548]">192.168.1.0/24</span>
        <div className="ml-auto text-[8.5px] font-mono text-[#2a3548]">42% · ETA 1m 12s</div>
      </div>
      {/* Progress */}
      <div className="px-3 py-1 bg-[#060810] border-b border-[#1c2333] shrink-0">
        <div className="h-[3px] bg-[#111827] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[#30d158]" style={{ width: '42%' }} />
        </div>
      </div>
      {/* Log lines */}
      <div
        ref={ref}
        className="flex-1 overflow-y-auto p-2.5 bg-[#040608] font-mono text-[9px] leading-relaxed"
      >
        <div className="text-[#1c2333] mb-1.5">ghost-scanner v3.0 · nmap 7.95 · cluster scan</div>
        {lines.map((log, i) => (
          <div key={i} className="flex gap-2 mb-0.5">
            <span className="text-[#1c2333] shrink-0">[{log.ts}]</span>
            <span
              className="shrink-0 font-bold uppercase"
              style={{ color: LOG_COLOR[log.level] ?? '#3a4558', minWidth: 32 }}
            >
              {log.level}
            </span>
            <span
              style={{
                color:
                  log.level === 'vuln'
                    ? '#ff2d55'
                    : log.level === 'warn'
                      ? '#f5a623'
                      : log.level === 'host'
                        ? '#30d158'
                        : log.level === 'port'
                          ? '#6a7a9a'
                          : '#3a4558',
              }}
            >
              {log.msg}
            </span>
          </div>
        ))}
        {idx < SCAN_LOGS.length && <span className="text-[#30d158] animate-pulse">█</span>}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: OVERVIEW
// ============================================================================
function TabOverview({
  hosts,
  onSelectHost,
}: {
  hosts: HostDetail[];
  onSelectHost: (ip: string) => void;
}) {
  const totalPorts = hosts.reduce((a, h) => a + h.ports.length, 0);
  const totalVulns = hosts.reduce((a, h) => a + (h.vulns?.length ?? 0), 0);
  const critVulns = hosts.reduce(
    (a, h) => a + (h.vulns?.filter((v) => v.severity === 'CRITICAL').length ?? 0),
    0,
  );
  const exploitableVulns = hosts.reduce(
    (a, h) => a + (h.vulns?.filter((v) => v.exploit).length ?? 0),
    0,
  );

  // Port distribution
  const portDist = [
    {
      label: 'Open',
      count: hosts.reduce((a, h) => a + h.ports.filter((p) => p.status === 'open').length, 0),
      color: '#30d158',
    },
    {
      label: 'Vuln',
      count: hosts.reduce((a, h) => a + h.ports.filter((p) => p.status === 'vuln').length, 0),
      color: '#ff2d55',
    },
    {
      label: 'Filtered',
      count: hosts.reduce((a, h) => a + h.ports.filter((p) => p.status === 'filtered').length, 0),
      color: '#f5a623',
    },
    {
      label: 'Closed',
      count: hosts.reduce((a, h) => a + h.ports.filter((p) => p.status === 'closed').length, 0),
      color: '#3a4558',
    },
  ];
  const totalPortCount = portDist.reduce((a, p) => a + p.count, 1);

  // Severity dist
  const sevDist = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => ({
    sev: s,
    count: hosts.reduce((a, h) => a + (h.vulns?.filter((v) => v.severity === s).length ?? 0), 0),
    color: SEV_COLOR[s],
  }));

  // Risk sparkline (host risk scores)
  const riskData = [...hosts]
    .sort((a, b) => (a.riskScore ?? 0) - (b.riskScore ?? 0))
    .map((h) => h.riskScore ?? 0);

  return (
    <div className="flex-1 overflow-y-auto p-2.5 bg-[#080b10]">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {[
          {
            label: 'Hosts Up',
            value: hosts.length.toString(),
            sub: 'of 256 scanned',
            color: '#30d158',
          },
          {
            label: 'Open Ports',
            value: totalPorts.toString(),
            sub: 'across all hosts',
            color: '#0af',
          },
          {
            label: 'Vulnerabilities',
            value: totalVulns.toString(),
            sub: `${critVulns} critical`,
            color: '#ff2d55',
          },
          {
            label: 'Exploitable',
            value: exploitableVulns.toString(),
            sub: 'public exploits',
            color: '#f5a623',
          },
        ].map((s) => (
          <Card key={s.label} accent={s.color} className="text-center">
            <div className="text-[22px] font-black font-mono" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[9px] font-bold font-mono text-[#c8d6f0] uppercase tracking-wider">
              {s.label}
            </div>
            <div className="text-[8px] font-mono text-[#2a3548] mt-0.5">{s.sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-2 mb-2">
        {/* Port distribution donut */}
        <div className="col-span-3">
          <Card title="Port Distribution" accent="#0af" titleAccent="#0af">
            {portDist.map((p) => (
              <div key={p.label} className="mb-1.5">
                <div className="flex justify-between mb-0.5">
                  <span className="text-[8.5px] font-mono" style={{ color: p.color }}>
                    {p.label}
                  </span>
                  <span className="text-[8.5px] font-mono font-bold" style={{ color: p.color }}>
                    {p.count}
                  </span>
                </div>
                <div className="h-[3px] bg-[#111827] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(p.count / totalPortCount) * 100}%`, background: p.color }}
                  />
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Vuln severity */}
        <div className="col-span-3">
          <Card title="Vuln Severity" accent="#ff2d55" titleAccent="#ff2d55">
            {sevDist.map((s) => (
              <div key={s.sev} className="flex items-center gap-2 mb-1.5">
                <SevBadge level={s.sev} />
                <div className="flex-1 h-[3px] bg-[#111827] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(s.count / Math.max(totalVulns, 1)) * 100}%`,
                      background: s.color,
                    }}
                  />
                </div>
                <span
                  className="text-[9px] font-bold font-mono w-4 text-right"
                  style={{ color: s.color }}
                >
                  {s.count}
                </span>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-[#111827]">
              <div className="text-[8px] font-mono text-[#2a3548] mb-0.5">Risk scores</div>
              <Sparkline data={riskData} color="#ff2d55" h={18} />
            </div>
          </Card>
        </div>

        {/* Host risk matrix */}
        <div className="col-span-6">
          <Card title="Host Risk Matrix" accent="#f5a623" titleAccent="#f5a623">
            <div className="space-y-1.5">
              {[...hosts]
                .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
                .map((h) => {
                  const rc = riskColor(h.riskScore ?? 0);
                  const critC = (h.vulns ?? []).filter((v) => v.severity === 'CRITICAL').length;
                  return (
                    <div
                      key={h.ip}
                      className="flex items-center gap-2 cursor-pointer hover:bg-[#111827] px-1 py-0.5 rounded transition-colors"
                      onClick={() => onSelectHost(h.ip)}
                    >
                      <span
                        className="text-[9.5px] font-bold font-mono w-28 shrink-0"
                        style={{ color: rc }}
                      >
                        {h.ip}
                      </span>
                      <div className="flex-1 h-[4px] bg-[#111827] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${h.riskScore ?? 0}%`, background: rc }}
                        />
                      </div>
                      <span
                        className="text-[9px] font-bold font-mono w-6 text-right shrink-0"
                        style={{ color: rc }}
                      >
                        {h.riskScore}
                      </span>
                      <div className="flex gap-0.5 w-20 shrink-0">
                        {critC > 0 && <Tag color="#ff2d55">{critC} crit</Tag>}
                        <Tag color="#3a4558">{h.ports.length}p</Tag>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      </div>

      {/* Critical vulns table */}
      <Card title="Critical & High Vulnerabilities" accent="#ff2d55" titleAccent="#ff2d55">
        <table className="w-full font-mono text-[9.5px]">
          <thead>
            <tr className="border-b border-[#1c2333]">
              {['CVE', 'Severity', 'CVSS', 'Host', 'Port', 'Description', 'Exploit'].map((h) => (
                <th
                  key={h}
                  className="text-left px-2 py-1 text-[8px] uppercase tracking-wider text-[#2a3548] font-normal"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hosts
              .flatMap((h) =>
                (h.vulns ?? [])
                  .filter((v) => v.severity === 'CRITICAL' || v.severity === 'HIGH')
                  .map((v) => ({ ...v, hostIp: h.ip })),
              )
              .map((v, i) => (
                <tr
                  key={i}
                  className="border-b border-[#0d1017] hover:bg-[#111827] transition-colors"
                >
                  <td className="px-2 py-1.5" style={{ color: SEV_COLOR[v.severity] }}>
                    {v.cve}
                  </td>
                  <td className="px-2 py-1.5">
                    <SevBadge level={v.severity} />
                  </td>
                  <td
                    className="px-2 py-1.5"
                    style={{ color: (v.cvss ?? 0) >= 9 ? '#ff2d55' : '#f5a623' }}
                  >
                    {v.cvss ?? '—'}
                  </td>
                  <td className="px-2 py-1.5 text-[#0af]">{v.hostIp}</td>
                  <td className="px-2 py-1.5 text-[#3a4558]">{v.port}</td>
                  <td className="px-2 py-1.5 text-[#6a7a9a]">{v.description}</td>
                  <td className="px-2 py-1.5">
                    {v.exploit ? (
                      <Tag color="#ff2d55">public</Tag>
                    ) : (
                      <Tag color="#3a4558">none</Tag>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============================================================================
// TAB: SCAN RESULTS (host list + live log)
// ============================================================================
function TabScanResults({
  hosts,
  selectedIp,
  onSelectHost,
}: {
  hosts: HostDetail[];
  selectedIp: string;
  onSelectHost: (ip: string) => void;
}) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Host list */}
      <div className="w-[340px] shrink-0 flex flex-col border-r border-[#1c2333]">
        <div className="flex items-center px-3 py-1.5 bg-[#060810] border-b border-[#1c2333] shrink-0">
          <span className="text-[9px] font-bold font-mono text-[#3a4558] uppercase tracking-wider">
            Discovered Hosts
          </span>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#30d158]" />
            <span className="text-[8.5px] font-mono text-[#30d158]">{hosts.length} up</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-[#080b10]">
          {hosts.map((h) => (
            <HostCard
              key={h.ip}
              host={h}
              selected={h.ip === selectedIp}
              onClick={() => onSelectHost(h.ip)}
            />
          ))}
        </div>
      </div>
      {/* Live scan log */}
      <ScanLog />
    </div>
  );
}

// ============================================================================
// TAB: HOST DETAIL
// ============================================================================
function TabHostDetail({ host }: { host: HostDetail | undefined }) {
  if (!host)
    return (
      <div className="flex-1 flex items-center justify-center text-[#2a3548] font-mono text-[9px]">
        Select a host to inspect
      </div>
    );

  return (
    <div className="flex-1 overflow-y-auto p-2.5 bg-[#080b10]">
      <div className="grid grid-cols-3 gap-2 mb-2">
        {/* Host info */}
        <Card title="Host Info" accent="#0af" titleAccent="#0af">
          <KV k="IP" v={host.ip} vc="text-[#0af] font-bold" />
          <KV k="Hostname" v={host.hostname} />
          <KV k="OS" v={`${host.os} (${host.osAccuracy}%)`} vc="text-[#bf5af2]" />
          <KV k="MAC" v={host.mac ?? '—'} />
          <KV k="Vendor" v={host.vendor ?? '—'} vc="text-[#f5a623]" />
          <KV k="Uptime" v={host.uptime ?? '—'} />
          <KV k="Last Boot" v={host.lastBoot ?? '—'} />
          <KV k="TTL" v={host.ttl?.toString() ?? '—'} />
          <div className="mt-2 pt-2 border-t border-[#111827] flex items-center gap-2">
            <RiskRing score={host.riskScore ?? 0} size={44} />
            <div>
              <div className="text-[8px] font-mono text-[#2a3548] uppercase tracking-wider">
                Risk Score
              </div>
              <div
                className="text-[10px] font-bold font-mono"
                style={{ color: riskColor(host.riskScore ?? 0) }}
              >
                {(host.riskScore ?? 0) >= 80
                  ? 'CRITICAL'
                  : (host.riskScore ?? 0) >= 50
                    ? 'HIGH'
                    : (host.riskScore ?? 0) >= 25
                      ? 'MEDIUM'
                      : 'LOW'}
              </div>
            </div>
          </div>
        </Card>

        {/* Nmap scripts */}
        <Card
          title="Nmap Script Output"
          accent="#f5a623"
          titleAccent="#f5a623"
          className="col-span-2"
        >
          {(host.scripts ?? []).length === 0 ? (
            <div className="text-[9px] font-mono text-[#2a3548]">No scripts run</div>
          ) : (
            (host.scripts ?? []).map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2 py-1.5 border-b border-[#111827] last:border-0"
              >
                <Tag
                  color={
                    s.risk === 'vulnerable' ? '#ff2d55' : s.risk === 'warning' ? '#f5a623' : '#0af'
                  }
                >
                  {s.risk}
                </Tag>
                <div className="min-w-0">
                  <div className="text-[9px] font-mono font-bold text-[#0af]">{s.id}</div>
                  <div className="text-[9px] font-mono text-[#6a7a9a] break-all">{s.output}</div>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Traceroute */}
      {host.traceroute && (
        <Card title="Traceroute" accent="#3a4558" className="mb-2">
          <div className="flex items-center gap-1.5 font-mono">
            {host.traceroute.map((hop, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[8px] text-[#2a3548]">{i + 1}</span>
                <span className="text-[9px]" style={{ color: hop === '—' ? '#2a3548' : '#0af' }}>
                  {hop}
                </span>
                {i < host.traceroute!.length - 1 && <span className="text-[#1c2333]">→</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Vulns */}
      {(host.vulns ?? []).length > 0 && (
        <Card
          title={`Vulnerabilities (${host.vulns!.length})`}
          accent="#ff2d55"
          titleAccent="#ff2d55"
        >
          <div className="space-y-1.5">
            {host.vulns!.map((v, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-2 py-1.5 rounded"
                style={{
                  background: `${SEV_COLOR[v.severity]}0a`,
                  border: `1px solid ${SEV_COLOR[v.severity]}25`,
                }}
              >
                <SevBadge level={v.severity} />
                <span
                  className="text-[10px] font-bold font-mono shrink-0"
                  style={{ color: SEV_COLOR[v.severity] }}
                >
                  {v.cve}
                </span>
                <span className="text-[9px] font-mono text-[#6a7a9a] flex-1">{v.description}</span>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span
                    className="text-[8.5px] font-mono"
                    style={{ color: (v.cvss ?? 0) >= 9 ? '#ff2d55' : '#f5a623' }}
                  >
                    CVSS {v.cvss}
                  </span>
                  <Tag color="#3a4558">:{v.port}</Tag>
                  {v.exploit && <Tag color="#ff2d55">exploit</Tag>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// TAB: SERVICES
// ============================================================================
function TabServices({ host }: { host: HostDetail | undefined }) {
  if (!host)
    return (
      <div className="flex-1 flex items-center justify-center text-[#2a3548] font-mono text-[9px]">
        Select a host
      </div>
    );

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 px-3 py-1.5 bg-[#060810] border-b border-[#1c2333] shrink-0">
        {Object.entries(PORT_STATUS_STYLE).map(([status, style]) => {
          const count = host.ports.filter((p) => p.status === status).length;
          if (!count) return null;
          return (
            <div key={status} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: style.color }} />
              <span className="text-[8.5px] font-mono" style={{ color: style.color }}>
                {status}: {count}
              </span>
            </div>
          );
        })}
        <span className="ml-auto text-[8.5px] font-mono text-[#2a3548]">
          {host.ip} · {host.ports.length} ports
        </span>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#080b10]">
        <table className="w-full font-mono text-[9.5px]">
          <thead className="sticky top-0 z-10 bg-[#060810] border-b border-[#1c2333]">
            <tr>
              {['Port', 'Proto', 'Status', 'Service', 'Product', 'Version', 'Banner', 'CVEs'].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-2.5 py-1.5 text-[8px] uppercase tracking-wider text-[#2a3548] font-normal"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {host.ports.map((p) => {
              const s = PORT_STATUS_STYLE[p.status];
              return (
                <tr
                  key={p.number}
                  className={cn(
                    'border-b border-[#0d1017] hover:bg-[#111827] transition-colors',
                    p.status === 'vuln' && 'bg-[#ff2d5504]',
                  )}
                >
                  <td className="px-2.5 py-1.5 font-bold" style={{ color: s.color }}>
                    {p.number}
                  </td>
                  <td className="px-2.5 py-1.5 text-[#3a4558]">{p.proto ?? 'tcp'}</td>
                  <td className="px-2.5 py-1.5">
                    <Tag color={s.color}>{p.status}</Tag>
                  </td>
                  <td className="px-2.5 py-1.5 text-[#6a7a9a]">{p.service}</td>
                  <td className="px-2.5 py-1.5 text-[#0af]">{p.product ?? '—'}</td>
                  <td className="px-2.5 py-1.5 text-[#4a5a7a]">{p.version ?? '—'}</td>
                  <td className="px-2.5 py-1.5 max-w-[180px]">
                    <span className="text-[8.5px] text-[#2a3548] truncate block">
                      {p.banner ?? '—'}
                    </span>
                  </td>
                  <td className="px-2.5 py-1.5">
                    <div className="flex gap-0.5 flex-wrap">
                      {p.cve?.map((c) => (
                        <Tag key={c} color="#ff2d55">
                          {c}
                        </Tag>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: VULNERABILITIES (global across all hosts)
// ============================================================================
function TabVulnerabilities({
  hosts,
  onSelectHost,
}: {
  hosts: HostDetail[];
  onSelectHost: (ip: string) => void;
}) {
  const [sevFilter, setSevFilter] = useState('ALL');
  const [exploitOnly, setExploitOnly] = useState(false);

  const allVulns = hosts.flatMap((h) =>
    (h.vulns ?? []).map((v) => ({ ...v, hostIp: h.ip, hostOs: h.os })),
  );
  const displayed = allVulns
    .filter((v) => sevFilter === 'ALL' || v.severity === sevFilter)
    .filter((v) => !exploitOnly || v.exploit);

  const sevs = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#060810] border-b border-[#1c2333] shrink-0 flex-wrap">
        {sevs.map((s) => {
          const c = s === 'ALL' ? '#0af' : SEV_COLOR[s];
          const active = sevFilter === s;
          return (
            <button
              key={s}
              onClick={() => setSevFilter(s)}
              className="px-2 h-5 rounded text-[8.5px] font-mono border transition-all"
              style={
                active
                  ? { color: '#080b10', background: c, borderColor: c, fontWeight: 'bold' }
                  : { color: c, borderColor: `${c}40` }
              }
            >
              {s}
            </button>
          );
        })}
        <button
          onClick={() => setExploitOnly(!exploitOnly)}
          className={cn(
            'px-2.5 h-5 rounded text-[8.5px] font-bold font-mono border transition-all ml-2',
            exploitOnly
              ? 'text-[#ff2d55] border-[#ff2d5530] bg-[#ff2d5512]'
              : 'text-[#2a3548] border-[#1c2333]',
          )}
        >
          {exploitOnly ? '● EXPLOIT' : '○ EXPLOIT'}
        </button>
        <span className="ml-auto text-[8.5px] font-mono text-[#2a3548]">
          {displayed.length} results
        </span>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#080b10]">
        <table className="w-full font-mono text-[9.5px]">
          <thead className="sticky top-0 z-10 bg-[#060810] border-b border-[#1c2333]">
            <tr>
              {['CVE', 'Severity', 'CVSS', 'Host', 'Port', 'Description', 'Exploit'].map((h) => (
                <th
                  key={h}
                  className="text-left px-2.5 py-1.5 text-[8px] uppercase tracking-wider text-[#2a3548] font-normal"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed
              .sort((a, b) => (b.cvss ?? 0) - (a.cvss ?? 0))
              .map((v, i) => (
                <tr
                  key={i}
                  className="border-b border-[#0d1017] hover:bg-[#111827] transition-colors cursor-pointer"
                  onClick={() => onSelectHost(v.hostIp)}
                >
                  <td className="px-2.5 py-1.5 font-bold" style={{ color: SEV_COLOR[v.severity] }}>
                    {v.cve}
                  </td>
                  <td className="px-2.5 py-1.5">
                    <SevBadge level={v.severity} />
                  </td>
                  <td
                    className="px-2.5 py-1.5 font-bold"
                    style={{ color: (v.cvss ?? 0) >= 9 ? '#ff2d55' : '#f5a623' }}
                  >
                    {v.cvss ?? '—'}
                  </td>
                  <td className="px-2.5 py-1.5 text-[#0af]">{v.hostIp}</td>
                  <td className="px-2.5 py-1.5 text-[#3a4558]">{v.port}</td>
                  <td className="px-2.5 py-1.5 text-[#6a7a9a]">{v.description}</td>
                  <td className="px-2.5 py-1.5">
                    {v.exploit ? (
                      <span className="text-[8px] font-bold font-mono px-1.5 py-[1px] rounded text-[#ff2d55] bg-[#ff2d5515] border border-[#ff2d5530]">
                        PUBLIC
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono text-[#2a3548]">—</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// TABS CONFIG
// ============================================================================
const TABS = [
  { id: 'overview', label: 'Overview', accent: '#30d158' },
  { id: 'results', label: 'Scan Results', accent: '#0af' },
  { id: 'host', label: 'Host Detail', accent: '#bf5af2' },
  { id: 'services', label: 'Services', accent: '#f5a623' },
  { id: 'vulns', label: 'Vulnerabilities', accent: '#ff2d55' },
] as const;
type TabId = (typeof TABS)[number]['id'];

// ============================================================================
// MAIN EXPORT
// ============================================================================
export function Scanner() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedIp, setSelectedIp] = useState(mockHosts[1].ip); // DC01 selected by default
  const accent = TABS.find((t) => t.id === activeTab)?.accent ?? '#0af';
  const selectedHost = mockHosts.find((h) => h.ip === selectedIp);

  const handleSelectHost = (ip: string) => {
    setSelectedIp(ip);
    setActiveTab('host');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <TabOverview hosts={mockHosts} onSelectHost={handleSelectHost} />;
      case 'results':
        return (
          <TabScanResults hosts={mockHosts} selectedIp={selectedIp} onSelectHost={setSelectedIp} />
        );
      case 'host':
        return <TabHostDetail host={selectedHost} />;
      case 'services':
        return <TabServices host={selectedHost} />;
      case 'vulns':
        return <TabVulnerabilities hosts={mockHosts} onSelectHost={handleSelectHost} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden bg-[#080b10]"
      style={{ fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace' }}
    >
      {/* Tab bar + toolbar */}
      <div className="flex items-center px-3 h-[30px] bg-[#060810] border-b border-[#1c2333] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'h-full px-3 text-[9px] uppercase tracking-[0.1em] font-bold transition-all relative whitespace-nowrap',
              activeTab === tab.id ? 'text-[#c8d6f0]' : 'text-[#2a3548] hover:text-[#4a5a7a]',
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: accent }}
              />
            )}
          </button>
        ))}

        {/* Toolbar */}
        <div className="ml-auto flex items-center gap-1.5">
          <input
            readOnly
            value="192.168.1.0/24"
            className="h-[20px] w-28 bg-[#111827] border border-[#1c2333] rounded text-[#f5a623] text-[8.5px] px-2 outline-none font-mono"
          />
          <button
            className="px-2 h-[20px] text-[8.5px] font-bold font-mono rounded border"
            style={{ color: '#30d158', borderColor: '#30d15830', background: '#30d15810' }}
          >
            ▶ Full Scan
          </button>
          <button className="px-2 h-[20px] text-[8.5px] font-mono rounded border border-[#1c2333] text-[#2a3548] hover:text-[#4a5a7a]">
            SYN
          </button>
          <button className="px-2 h-[20px] text-[8.5px] font-mono rounded border border-[#1c2333] text-[#2a3548] hover:text-[#4a5a7a]">
            UDP
          </button>
          <button className="px-2 h-[20px] text-[8.5px] font-mono rounded border border-[#1c2333] text-[#2a3548] hover:text-[#4a5a7a]">
            Scripts
          </button>
          <div className="w-px h-3 bg-[#1c2333] mx-1" />
          <button
            className="px-2 h-[20px] text-[8.5px] font-bold font-mono rounded border"
            style={{ color: '#ff2d55', borderColor: '#ff2d5530', background: '#ff2d5510' }}
          >
            ■ Stop
          </button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
