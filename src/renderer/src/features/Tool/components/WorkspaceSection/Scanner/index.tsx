// src/renderer/src/features/Tool/components/WorkspaceSection/Scanner/index.tsx
import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import {
  Badge,
  ModuleTabBar,
  ToolbarButton,
  LogLine,
  ProgressBar,
  PulseIndicator,
  KVRow,
} from '../../../../../core/components/ui';

// ============================================================================
// 1. MOCK DATA CHI TIẾT (cho mạng nội bộ 192.168.1.0/24)
// ============================================================================

// Kiểu dữ liệu port
type PortStatus = 'open' | 'filtered' | 'closed' | 'vuln';

interface PortDetail {
  number: number;
  service: string;
  product?: string;
  version?: string;
  status: PortStatus;
  cve?: string[];
  banner?: string;
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
  ports: PortDetail[];
  scripts?: ScriptOutput[];
  traceroute?: string[];
  vulns?: VulnSummary[];
}

interface ScriptOutput {
  id: string;
  output: string;
  risk?: 'info' | 'warning' | 'vulnerable';
}

interface VulnSummary {
  cve: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  port: number;
}

// --- Mock Hosts chi tiết ---
const mockHostsDetailed: HostDetail[] = [
  {
    ip: '192.168.1.1',
    hostname: 'gateway.local',
    os: 'Linux (OpenWrt)',
    osAccuracy: 92,
    mac: '00:1A:2B:3C:4D:5E',
    vendor: 'TP-Link',
    uptime: '14 days, 3 hours',
    lastBoot: '2025-05-19 08:00:00',
    ports: [
      {
        number: 22,
        service: 'ssh',
        product: 'Dropbear',
        version: '2022.82',
        status: 'open',
        banner: 'SSH-2.0-dropbear_2022.82',
      },
      {
        number: 80,
        service: 'http',
        product: 'uhttpd',
        version: '1.0',
        status: 'open',
        banner: 'HTTP/1.1 200 OK',
      },
      {
        number: 443,
        service: 'https',
        product: 'uhttpd',
        version: '1.0',
        status: 'open',
        banner: 'TLS 1.2',
      },
      {
        number: 53,
        service: 'domain',
        product: 'dnsmasq',
        version: '2.85',
        status: 'open',
        banner: 'DNS server',
      },
      { number: 1900, service: 'upnp', product: 'MiniUPnPd', version: '2.1', status: 'open' },
    ],
    scripts: [
      { id: 'http-title', output: 'OpenWrt LuCI', risk: 'info' },
      { id: 'ssh-hostkey', output: 'RSA key fingerprint: 2b:3c:4d:5e...', risk: 'info' },
    ],
    traceroute: ['192.168.1.1', '*', '10.0.0.1'],
    vulns: [],
  },
  {
    ip: '192.168.1.10',
    hostname: 'dc01.corp.local',
    os: 'Windows Server 2019',
    osAccuracy: 98,
    mac: '00:50:56:A1:B2:C3',
    vendor: 'VMware',
    uptime: '67 days, 12 hours',
    lastBoot: '2025-03-27 15:30:00',
    ports: [
      {
        number: 88,
        service: 'kerberos',
        product: 'Microsoft Kerberos',
        version: '10.0',
        status: 'vuln',
        cve: ['CVE-2021-42282'],
        banner: 'Kerberos 5',
      },
      { number: 135, service: 'msrpc', product: 'Microsoft RPC', version: '10.0', status: 'open' },
      { number: 139, service: 'netbios-ssn', product: 'Samba', version: '3.0', status: 'open' },
      {
        number: 389,
        service: 'ldap',
        product: 'Microsoft AD LDAP',
        version: '10.0',
        status: 'open',
        banner: 'LDAP server',
      },
      {
        number: 445,
        service: 'smb',
        product: 'Microsoft SMB',
        version: '3.1.1',
        status: 'vuln',
        cve: ['MS17-010', 'CVE-2020-0796'],
        banner: 'SMBv3',
      },
      {
        number: 3389,
        service: 'rdp',
        product: 'Microsoft RDP',
        version: '10.0',
        status: 'open',
        banner: 'RDP 8.0',
      },
    ],
    scripts: [
      { id: 'smb-vuln-ms17-010', output: 'VULNERABLE: EternalBlue', risk: 'vulnerable' },
      { id: 'smb-os-discovery', output: 'Windows Server 2019 Standard 17763', risk: 'info' },
      { id: 'ldap-rootdse', output: 'defaultNamingContext: DC=corp,DC=local', risk: 'info' },
    ],
    vulns: [
      { cve: 'MS17-010', severity: 'CRITICAL', description: 'EternalBlue SMB RCE', port: 445 },
      { cve: 'CVE-2020-0796', severity: 'CRITICAL', description: 'SMBGhost RCE', port: 445 },
      {
        cve: 'CVE-2021-42282',
        severity: 'HIGH',
        description: 'Kerberos elevation of privilege',
        port: 88,
      },
    ],
  },
  {
    ip: '192.168.1.20',
    hostname: 'web01.corp.local',
    os: 'Ubuntu 22.04',
    osAccuracy: 95,
    mac: '08:00:27:AB:CD:EF',
    vendor: 'Oracle VirtualBox',
    uptime: '3 days, 2 hours',
    lastBoot: '2025-05-30 18:45:00',
    ports: [
      {
        number: 22,
        service: 'ssh',
        product: 'OpenSSH',
        version: '8.9p1 Ubuntu 3ubuntu0.4',
        status: 'open',
        banner: 'SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.4',
        cve: ['CVE-2023-38408'],
      },
      {
        number: 80,
        service: 'http',
        product: 'nginx',
        version: '1.24.0',
        status: 'open',
        banner: 'HTTP/1.1 200 OK\r\nServer: nginx/1.24.0',
      },
      {
        number: 443,
        service: 'https',
        product: 'nginx',
        version: '1.24.0',
        status: 'open',
        banner: 'TLS 1.3',
      },
      {
        number: 3306,
        service: 'mysql',
        product: 'MySQL',
        version: '8.0.33',
        status: 'vuln',
        cve: ['CVE-2023-2182'],
        banner: 'mysql_native_password',
      },
      {
        number: 8080,
        service: 'http',
        product: 'Jenkins',
        version: '2.401.1',
        status: 'vuln',
        cve: ['CVE-2023-27898'],
        banner: 'Jenkins CI',
      },
    ],
    scripts: [
      { id: 'http-title', output: 'Welcome to nginx!', risk: 'info' },
      { id: 'http-methods', output: 'GET HEAD POST OPTIONS', risk: 'info' },
      { id: 'mysql-empty-password', output: 'Anonymous login allowed', risk: 'vulnerable' },
      {
        id: 'http-jenkins-version',
        output: 'Jenkins 2.401.1 (CVE-2023-27898)',
        risk: 'vulnerable',
      },
    ],
    vulns: [
      { cve: 'CVE-2023-38408', severity: 'HIGH', description: 'OpenSSH RCE', port: 22 },
      { cve: 'CVE-2023-2182', severity: 'MEDIUM', description: 'MySQL DoS', port: 3306 },
      {
        cve: 'CVE-2023-27898',
        severity: 'CRITICAL',
        description: 'Jenkins auth bypass',
        port: 8080,
      },
    ],
  },
  {
    ip: '192.168.1.30',
    hostname: '—',
    os: 'Unknown (likely IoT)',
    osAccuracy: 45,
    mac: 'AC:DE:48:12:34:56',
    vendor: 'Raspberry Pi Foundation',
    uptime: '0 days, 18 hours',
    lastBoot: '2025-06-01 06:00:00',
    ports: [
      {
        number: 21,
        service: 'ftp',
        product: 'vsftpd',
        version: '3.0.5',
        status: 'open',
        banner: '220 Welcome',
        cve: ['CVE-2015-1419'],
      },
      {
        number: 23,
        service: 'telnet',
        product: 'busybox telnetd',
        version: '1.33.2',
        status: 'vuln',
        banner: 'login:',
        cve: ['CVE-2022-30065'],
      },
      {
        number: 8080,
        service: 'http',
        product: 'lighttpd',
        version: '1.4.69',
        status: 'open',
        banner: 'HTTP/1.1 200 OK',
      },
    ],
    scripts: [
      { id: 'ftp-anon', output: 'Anonymous FTP login allowed', risk: 'vulnerable' },
      { id: 'telnet-brute', output: 'Default credentials admin:admin found', risk: 'vulnerable' },
    ],
    vulns: [
      { cve: 'CVE-2022-30065', severity: 'HIGH', description: 'BusyBox telnetd RCE', port: 23 },
    ],
  },
  {
    ip: '192.168.1.50',
    hostname: 'mail.corp.local',
    os: 'Debian 11',
    osAccuracy: 88,
    mac: '00:50:56:A1:D2:E3',
    vendor: 'VMware',
    uptime: '32 days, 10 hours',
    lastBoot: '2025-04-30 20:00:00',
    ports: [
      {
        number: 25,
        service: 'smtp',
        product: 'Postfix',
        version: '3.5.18',
        status: 'open',
        banner: '220 mail.corp.local ESMTP Postfix',
      },
      {
        number: 110,
        service: 'pop3',
        product: 'Dovecot',
        version: '2.3.13',
        status: 'open',
        banner: '+OK Dovecot ready',
      },
      {
        number: 143,
        service: 'imap',
        product: 'Dovecot',
        version: '2.3.13',
        status: 'open',
        banner: '* OK [CAPABILITY...]',
      },
      {
        number: 587,
        service: 'smtp',
        product: 'Postfix',
        version: '3.5.18',
        status: 'open',
        banner: '220 mail.corp.local ESMTP',
      },
    ],
    scripts: [
      { id: 'smtp-commands', output: 'HELP, EHLO, STARTTLS, AUTH PLAIN LOGIN', risk: 'info' },
      { id: 'smtp-vuln-cve2010-4344', output: 'Not vulnerable', risk: 'info' },
    ],
    vulns: [],
  },
];

// --- Scan logs mở rộng ---
const detailedScanLogs = [
  {
    ts: '09:14:32',
    tag: 'SCAN',
    tagColor: 'cyan',
    msg: 'Starting Nmap 7.95 scan on 192.168.1.0/24',
  },
  { ts: '09:14:33', tag: 'HOST', tagColor: 'green', msg: '192.168.1.1 — Up (0.00035s latency)' },
  { ts: '09:14:34', tag: 'PORT', tagColor: 'green', msg: '22/tcp open  ssh OpenSSH 8.9' },
  { ts: '09:14:34', tag: 'PORT', tagColor: 'green', msg: '80/tcp open  http nginx 1.24.0' },
  { ts: '09:14:35', tag: 'WARN', tagColor: 'amber', msg: 'SMB signing disabled on 192.168.1.10' },
  {
    ts: '09:14:36',
    tag: 'VULN',
    tagColor: 'red',
    msg: '445/tcp open — EternalBlue (MS17-010) possible',
  },
  {
    ts: '09:14:36',
    tag: 'VULN',
    tagColor: 'red',
    msg: '3306/tcp open MySQL — anonymous auth allowed',
  },
  {
    ts: '09:14:37',
    tag: 'WARN',
    tagColor: 'amber',
    msg: 'Telnet (23) detected on 192.168.1.30 — plaintext protocol',
  },
  { ts: '09:14:38', tag: 'INFO', tagColor: 'cyan', msg: 'Scanning 192.168.1.40-60 …' },
  {
    ts: '09:14:39',
    tag: 'CRIT',
    tagColor: 'purple',
    msg: 'Log4Shell (CVE-2021-44228) indicator on 192.168.1.20:8080',
  },
  {
    ts: '09:14:40',
    tag: 'INFO',
    tagColor: 'cyan',
    msg: 'OS detection: 192.168.1.10 — Windows Server 2019 (TTL 128)',
  },
  {
    ts: '09:14:41',
    tag: 'DBG',
    tagColor: 'gray',
    msg: 'RTT variance: min=0.3ms avg=1.2ms max=14ms',
  },
  {
    ts: '09:14:42',
    tag: 'SCRIPT',
    tagColor: 'cyan',
    msg: 'smb-vuln-ms17-010: VULNERABLE on 192.168.1.10',
  },
  {
    ts: '09:14:43',
    tag: 'SCRIPT',
    tagColor: 'cyan',
    msg: 'mysql-empty-password: Anonymous login on 192.168.1.20:3306',
  },
  { ts: '09:14:44', tag: 'HOST', tagColor: 'green', msg: '192.168.1.30 — Up (0.00089s)' },
  {
    ts: '09:14:45',
    tag: 'VULN',
    tagColor: 'red',
    msg: '23/tcp telnet — Default credentials (admin:admin) on 192.168.1.30',
  },
];

// ============================================================================
// 2. UI COMPONENTS (giữ nguyên PortTag, HostCard, ScanLogPanel nhưng nâng cấp)
// ============================================================================

const PORT_CLASS: Record<PortStatus, string> = {
  open: 'bg-green-500/10 text-green-400 border border-green-500/20',
  filtered: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  closed: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  vuln: 'bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse',
};

function PortTag({ port, status }: { port: number; status: PortStatus }) {
  return (
    <span className={cn('px-1.5 py-0 text-[10px] font-bold rounded', PORT_CLASS[status])}>
      {port}
    </span>
  );
}

function HostCard({
  host,
  selected,
  onClick,
}: {
  host: HostDetail;
  selected?: boolean;
  onClick?: () => void;
}) {
  const vulnCount = host.ports.filter((p) => p.status === 'vuln').length;
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[#111520] border rounded-md p-2.5 cursor-pointer transition-all',
        selected
          ? 'border-cyan-500/25 bg-cyan-500/4'
          : 'border-[#1e2535] hover:border-[#252e42] hover:bg-[#161b26]',
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[12.5px] font-bold text-cyan-400 font-mono">{host.ip}</span>
        <span className="text-[10.5px] text-[#6b7a96] truncate">{host.hostname}</span>
        <span className="ml-auto text-[10px] px-1.5 py-0 rounded bg-purple-500/12 text-purple-400 border border-purple-500/20">
          {host.os}
        </span>
        {vulnCount > 0 && <Badge color="red">{vulnCount} vuln</Badge>}
      </div>
      <div className="flex flex-wrap gap-1">
        {host.ports.slice(0, 8).map((p) => (
          <PortTag key={p.number} port={p.number} status={p.status} />
        ))}
        {host.ports.length > 8 && (
          <span className="text-[9px] text-[#6b7a96]">+{host.ports.length - 8}</span>
        )}
      </div>
    </div>
  );
}

function ScanLogPanel() {
  return (
    <div className="flex flex-col bg-[#141924] overflow-hidden w-1/2">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">
          Scan Output
        </span>
        <div className="flex items-center gap-1 text-[10px] text-green-400">
          <PulseIndicator /> Running 42%
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {detailedScanLogs.map((l, i) => (
          <LogLine key={i} ts={l.ts} tag={l.tag} tagColor={l.tagColor} msg={l.msg} />
        ))}
      </div>
      <div className="px-3 py-2 border-t border-[#1e2535] shrink-0">
        <div className="flex justify-between text-[10px] text-[#6b7a96] mb-1">
          <span>Scanning 192.168.1.0/24 (256 hosts)</span>
          <span>42% — ETA 1m 12s</span>
        </div>
        <ProgressBar pct={42} color="cyan" />
      </div>
    </div>
  );
}

// ============================================================================
// 3. TAB COMPONENTS
// ============================================================================

function TabScanResults({ hosts, selectedIp, onSelectHost }: any) {
  return (
    <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
      <div className="flex flex-col bg-[#141924] overflow-hidden w-1/2">
        <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
          <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">
            Discovered Hosts
          </span>
          <Badge color="green">{hosts.length} up</Badge>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
          {hosts.map((h: HostDetail) => (
            <HostCard
              key={h.ip}
              host={h}
              selected={h.ip === selectedIp}
              onClick={() => onSelectHost(h.ip)}
            />
          ))}
        </div>
      </div>
      <ScanLogPanel />
    </div>
  );
}

function TabHostDetails({ host }: { host: HostDetail | undefined }) {
  if (!host)
    return (
      <div className="flex-1 flex items-center justify-center text-[#6b7a96]">Select a host</div>
    );
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase mb-2">Host Info</div>
          <KVRow label="IP" value={host.ip} valueColor="text-cyan-400" />
          <KVRow label="Hostname" value={host.hostname} />
          <KVRow label="OS" value={`${host.os} (accuracy: ${host.osAccuracy}%)`} />
          <KVRow label="MAC Address" value={host.mac || '—'} />
          <KVRow label="Vendor" value={host.vendor || '—'} />
          <KVRow label="Uptime" value={host.uptime || '—'} />
          <KVRow label="Last Boot" value={host.lastBoot || '—'} />
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase mb-2">Traceroute</div>
          {host.traceroute ? (
            host.traceroute.map((hop, i) => (
              <div key={i} className="text-[10.5px] font-mono">
                {i + 1}. {hop}
              </div>
            ))
          ) : (
            <div className="text-[10.5px] text-[#6b7a96]">Not available</div>
          )}
        </div>
        <div className="col-span-2 bg-[#111520] border border-[#1e2535] rounded p-3">
          <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase mb-2">
            Nmap Script Results
          </div>
          {host.scripts?.map((s, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-[#1e2535] last:border-0">
              <div className="text-[10.5px] font-mono text-cyan-400">{s.id}</div>
              <div
                className={cn(
                  'text-[10px] mt-0.5',
                  s.risk === 'vulnerable'
                    ? 'text-red-400'
                    : s.risk === 'warning'
                      ? 'text-amber-400'
                      : 'text-[#c5cfe0]',
                )}
              >
                {s.output}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabServices({ host }: { host: HostDetail | undefined }) {
  if (!host)
    return (
      <div className="flex-1 flex items-center justify-center text-[#6b7a96]">Select a host</div>
    );
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <table className="w-full text-[11px] border-collapse">
        <thead className="bg-[#0f1319] border-b border-[#1e2535]">
          <tr>
            <th className="text-left p-2 text-[#3d4a61]">Port</th>
            <th className="text-left p-2 text-[#3d4a61]">Service</th>
            <th className="text-left p-2 text-[#3d4a61]">Product</th>
            <th className="text-left p-2 text-[#3d4a61]">Version</th>
            <th className="text-left p-2 text-[#3d4a61]">Banner</th>
            <th className="text-left p-2 text-[#3d4a61]">CVE</th>
          </tr>
        </thead>
        <tbody>
          {host.ports.map((p) => (
            <tr key={p.number} className="border-b border-[#1e2535] hover:bg-[#111520]">
              <td className="p-2 font-mono text-amber-400">{p.number}</td>
              <td className="p-2">{p.service}</td>
              <td className="p-2">{p.product || '—'}</td>
              <td className="p-2">{p.version || '—'}</td>
              <td className="p-2 text-[10px] font-mono text-[#6b7a96] truncate max-w-[200px]">
                {p.banner || '—'}
              </td>
              <td className="p-2">
                {p.cve?.map((c) => (
                  <Badge key={c} color="red" className="mr-1">
                    {c}
                  </Badge>
                )) || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabVulnerabilities({ host }: { host: HostDetail | undefined }) {
  if (!host)
    return (
      <div className="flex-1 flex items-center justify-center text-[#6b7a96]">Select a host</div>
    );
  const vulns = host.vulns || [];
  if (vulns.length === 0)
    return (
      <div className="flex-1 flex items-center justify-center text-green-400">
        No known vulnerabilities detected
      </div>
    );
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e] space-y-2">
      {vulns.map((v, i) => (
        <div
          key={i}
          className={cn(
            'border rounded p-3',
            v.severity === 'CRITICAL'
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-amber-500/30 bg-amber-500/5',
          )}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-mono text-red-400">{v.cve}</span>
            <Badge color={v.severity === 'CRITICAL' ? 'red' : 'amber'}>{v.severity}</Badge>
          </div>
          <div className="text-[11px] text-[#c5cfe0]">{v.description}</div>
          <div className="text-[10px] text-[#6b7a96] mt-1">Affected port: {v.port}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 4. MAIN EXPORT
// ============================================================================
const TABS = ['Scan Results', 'Host Details', 'Services', 'Vulnerabilities'] as const;

export function Scanner() {
  const [selectedIp, setSelectedIp] = useState(mockHostsDetailed[0].ip);
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);
  const selectedHost = mockHostsDetailed.find((h) => h.ip === selectedIp);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Scan Results':
        return (
          <TabScanResults
            hosts={mockHostsDetailed}
            selectedIp={selectedIp}
            onSelectHost={setSelectedIp}
          />
        );
      case 'Host Details':
        return <TabHostDetails host={selectedHost} />;
      case 'Services':
        return <TabServices host={selectedHost} />;
      case 'Vulnerabilities':
        return <TabVulnerabilities host={selectedHost} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModuleTabBar
        tabs={TABS}
        active={activeTab}
        onTabChange={setActiveTab}
        activeColor="text-green-400 border-green-400 bg-green-500/5"
      />
      <div className="shrink-0">
        <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] overflow-x-auto">
          <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] mx-0.5 whitespace-nowrap">
            Scope:
          </span>
          <input
            readOnly
            value="192.168.1.0/24"
            className="h-6 w-36 bg-[#111520] border border-[#252e42] rounded text-amber-400 text-[11px] px-2 outline-none font-mono"
          />
          <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />
          <ToolbarButton variant="cyan">▶ Full Scan</ToolbarButton>
          <ToolbarButton variant="green">▶ Quick SYN</ToolbarButton>
          <ToolbarButton>UDP Scan</ToolbarButton>
          <ToolbarButton>OS Detect</ToolbarButton>
          <ToolbarButton>Svc Version</ToolbarButton>
          <ToolbarButton>Scripts</ToolbarButton>
          <ToolbarButton variant="red" className="ml-auto">
            ■ Stop
          </ToolbarButton>
        </div>
      </div>
      {renderTabContent()}
    </div>
  );
}
