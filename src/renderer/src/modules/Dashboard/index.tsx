import { useEffect, useRef, useState } from 'react';
import { cn } from '../../shared/lib/utils';
import { useModulePersistence } from '../../hooks/useModulePersistence';
import { $ } from '@renderer/utils/color';

const stats = {
  totalVulns: 27,
  critical: 3,
  high: 7,
  medium: 12,
  low: 5,
  activeSessions: 3,
  totalTargets: 5,
  completedScans: 12,
  crackedCreds: 14,
  totalFindings: 47,
  riskScore: 78,
  avgCvss: 7.4,
  exploitSuccess: 91,
  dataExfiltrated: '2.3 GB',
};

const recentActivities = [
  {
    id: 1,
    time: '09:52:20',
    type: 'REPORT',
    message: 'Executive report generated: 27 findings',
    severity: 'info',
  },
  {
    id: 2,
    time: '09:48:44',
    type: 'PHISH',
    message: 'Campaign "Corp IT Alert" → 11 creds harvested',
    severity: 'medium',
  },
  {
    id: 3,
    time: '09:45:12',
    type: 'SQLI',
    message: 'SQL injection on /api/v1/login → full DB dump',
    severity: 'high',
  },
  {
    id: 4,
    time: '09:41:33',
    type: 'SESSION',
    message: 'Meterpreter #2 opened @ 192.168.1.10 (SYSTEM)',
    severity: 'critical',
  },
  {
    id: 5,
    time: '09:38:01',
    type: 'CRED',
    message: 'Cracked Administrator NTLM → P@ssw0rd!',
    severity: 'high',
  },
  {
    id: 6,
    time: '09:35:22',
    type: 'SCAN',
    message: 'Port scan done: 12 hosts up, 47 open ports',
    severity: 'info',
  },
  {
    id: 7,
    time: '09:32:15',
    type: 'EXPLOIT',
    message: 'Log4Shell @ 192.168.1.20:8080 → root shell',
    severity: 'critical',
  },
  {
    id: 8,
    time: '09:28:50',
    type: 'RECON',
    message: 'Subdomain enum: 16 found, 4 critical-risk assets',
    severity: 'medium',
  },
  {
    id: 9,
    time: '09:21:03',
    type: 'CRACK',
    message: 'hashcat rockyou → 14/22 hashes cracked (64%)',
    severity: 'high',
  },
];

const activeSessions = [
  {
    id: 1,
    target: '192.168.1.10',
    user: 'SYSTEM',
    type: 'meterpreter',
    platform: 'Windows Server 2019',
    uptime: '2h 14m',
    pid: 1337,
    arch: 'x64',
  },
  {
    id: 2,
    target: '192.168.1.20',
    user: 'root',
    type: 'shell',
    platform: 'Ubuntu 22.04',
    uptime: '1h 32m',
    pid: 4821,
    arch: 'x64',
  },
  {
    id: 3,
    target: 'target.corp.local',
    user: 'www-data',
    type: 'meterpreter',
    platform: 'Debian 11',
    uptime: '45m',
    pid: 2209,
    arch: 'x64',
  },
];

const topVulns = [
  {
    name: 'Log4Shell RCE',
    cve: 'CVE-2021-44228',
    cvss: 10.0,
    severity: 'CRITICAL',
    target: '192.168.1.20:8080',
    exploited: true,
  },
  {
    name: 'EternalBlue SMB',
    cve: 'MS17-010',
    cvss: 9.8,
    severity: 'CRITICAL',
    target: '192.168.1.10:445',
    exploited: true,
  },
  {
    name: 'PrintNightmare',
    cve: 'CVE-2021-34527',
    cvss: 8.8,
    severity: 'HIGH',
    target: '192.168.1.10:445',
    exploited: false,
  },
  {
    name: 'SQL Injection',
    cve: 'CWE-89',
    cvss: 8.1,
    severity: 'HIGH',
    target: '/api/v1/login',
    exploited: true,
  },
  {
    name: 'Stored XSS',
    cve: 'CWE-79',
    cvss: 7.5,
    severity: 'HIGH',
    target: '/blog/comments',
    exploited: false,
  },
  {
    name: 'Weak TLS Cipher',
    cve: 'CVE-2016-2183',
    cvss: 5.9,
    severity: 'MEDIUM',
    target: '443/https',
    exploited: false,
  },
];

const moduleStatus = [
  { name: 'Recon', status: 'idle', progress: 100, lastRun: '09:15', findings: 16 },
  { name: 'Scanner', status: 'running', progress: 42, lastRun: '09:30', findings: 27 },
  { name: 'Exploit', status: 'idle', progress: 100, lastRun: '09:38', findings: 3 },
  { name: 'Phishing', status: 'idle', progress: 100, lastRun: '09:20', findings: 11 },
  { name: 'Cracking', status: 'running', progress: 64, lastRun: '09:45', findings: 14 },
  { name: 'Exfil', status: 'idle', progress: 100, lastRun: '09:50', findings: 4 },
];

// Hourly activity data for sparkline
const hourlyData = [2, 5, 3, 8, 12, 7, 15, 22, 18, 27, 31, 19];

// Targets
const targets = [
  { host: '192.168.1.10', os: 'Windows', role: 'DC', vulns: 8, sessions: 1, status: 'compromised' },
  { host: '192.168.1.20', os: 'Linux', role: 'Web', vulns: 6, sessions: 1, status: 'compromised' },
  { host: '192.168.1.30', os: 'Linux', role: 'DB', vulns: 4, sessions: 0, status: 'scanning' },
  {
    host: '192.168.1.40',
    os: 'Windows',
    role: 'Workstation',
    vulns: 5,
    sessions: 0,
    status: 'discovered',
  },
  {
    host: 'target.corp.local',
    os: 'Linux',
    role: 'App',
    vulns: 4,
    sessions: 1,
    status: 'compromised',
  },
];

// ============================================================================
// CONSTANTS
// ============================================================================
const RISK_COLOR: Record<string, string> = {
  critical: '#ff2d55',
  high: '#ff6b35',
  medium: '#f5a623',
  low: '#30d158',
  info: '#0af',
  CRITICAL: '#ff2d55',
  HIGH: '#ff6b35',
  MEDIUM: '#f5a623',
  LOW: '#30d158',
  compromised: '#ff2d55',
  scanning: '#f5a623',
  discovered: '#0af',
  idle: '#636366',
};

// ============================================================================
// SVG CHARTS
// ============================================================================
function DonutChart() {
  const total = stats.totalVulns;
  const slices = [
    { val: stats.critical, color: '#ff2d55', label: 'Critical' },
    { val: stats.high, color: '#ff6b35', label: 'High' },
    { val: stats.medium, color: '#f5a623', label: 'Medium' },
    { val: stats.low, color: '#30d158', label: 'Low' },
  ];
  const circ = 2 * Math.PI * 32;
  let offset = 0;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 80 80" className="w-20 h-20 shrink-0">
        <circle cx="40" cy="40" r="32" fill="none" stroke={$('--border') || ''} strokeWidth="10" />
        {slices.map((s, i) => {
          const pct = s.val / total;
          const dash = pct * circ;
          const el = (
            <circle
              key={i}
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke={s.color}
              strokeWidth="10"
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 40 40)"
            />
          );
          offset += dash;
          return el;
        })}
        <text
          x="40"
          y="37"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill={$('--text-primary') || ''}
          fontFamily="monospace"
        >
          {total}
        </text>
        <text
          x="40"
          y="49"
          textAnchor="middle"
          fontSize="6"
          fill={$('--text-secondary') || ''}
          fontFamily="monospace"
        >
          VULNS
        </text>
      </svg>
      <div className="space-y-1">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[9px] font-mono text-text-secondary">{s.label}</span>
            <span className="text-[9px] font-bold font-mono ml-auto" style={{ color: s.color }}>
              {s.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ data, color = '#0af' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const w = 120,
    h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`${color}15`} stroke="none" />
    </svg>
  );
}

function RiskGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#ff2d55' : score >= 60 ? '#ff6b35' : '#f5a623';
  const r = 28,
    circ = Math.PI * r; // half circle
  const dash = (score / 100) * circ;
  return (
    <svg viewBox="0 0 72 42" className="w-24 h-14">
      <path
        d="M 8 36 A 28 28 0 0 1 64 36"
        fill="none"
        stroke={$('--border') || ''}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M 8 36 A 28 28 0 0 1 64 36"
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
      <text
        x="36"
        y="34"
        textAnchor="middle"
        fontSize="13"
        fontWeight="bold"
        fill={color}
        fontFamily="monospace"
      >
        {score}
      </text>
      <text
        x="36"
        y="41"
        textAnchor="middle"
        fontSize="5.5"
        fill={$('--text-secondary') || ''}
        fontFamily="monospace"
      >
        RISK SCORE
      </text>
    </svg>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 h-[3px] bg-[#111827] rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function ActivityBar({ data }: { data: number[] }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-[2px] h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${(v / max) * 100}%`,
            background: i === data.length - 1 ? '#0af' : $('--border'),
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================
function StatBox({
  label,
  value,
  sub,
  accent,
  spark,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  spark?: number[];
}) {
  return (
    <div className="bg-card-background border border-border rounded p-2.5 flex flex-col gap-1">
      <div className="text-[8.5px] uppercase tracking-[0.12em] text-text-secondary font-mono">
        {label}
      </div>
      <div
        className="text-[20px] font-bold font-mono leading-none"
        style={{ color: accent ?? $('--text-primary') }}
      >
        {value}
      </div>
      {spark && <Sparkline data={spark} color={accent ?? '#0af'} />}
      {sub && !spark && <div className="text-[8.5px] text-text-secondary font-mono">{sub}</div>}
    </div>
  );
}

function SectionCard({
  title,
  accent,
  children,
  className,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-card-background border border-border rounded p-3', className)}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="w-[3px] h-3 rounded-full" style={{ background: accent ?? '#0af' }} />
        <span className="text-[9px] font-bold tracking-[0.12em] uppercase font-mono text-text-secondary">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function SessionRow({ s }: { s: (typeof activeSessions)[0] }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border last:border-0 group">
      <div className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse shrink-0" />
      <span className="font-mono text-[10px] text-primary w-32 shrink-0">{s.target}</span>
      <span
        className="text-[10px] font-bold font-mono w-20 shrink-0"
        style={{ color: s.user === 'SYSTEM' || s.user === 'root' ? '#ff2d55' : '#f5a623' }}
      >
        {s.user}
      </span>
      <span className="text-[9px] text-text-secondary font-mono w-16 shrink-0">{s.type}</span>
      <span className="text-[9px] text-text-secondary flex-1 truncate">{s.platform}</span>
      <span className="text-[9px] text-text-secondary font-mono w-12 text-right shrink-0">
        {s.uptime}
      </span>
      <button className="text-[8px] font-mono font-bold px-2 py-0.5 rounded border opacity-0 group-hover:opacity-100 transition-opacity text-primary border-primary/30 bg-primary/10 hover:bg-primary/20">
        INTERACT
      </button>
    </div>
  );
}

// ============================================================================
// LIVE CLOCK
// ============================================================================
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-[10px] text-text-secondary">
      {time.toISOString().replace('T', ' ').slice(0, 19)} UTC
    </span>
  );
}

// ============================================================================
// TERMINAL FEED (animated)
// ============================================================================
const FEED_MSGS = [
  '[+] Scanner: 192.168.1.30:3306 — MySQL 5.7 OPEN (CVE-2023-2182)',
  '[+] Cracking: 9/14 hashes cracked (rockyou.txt pass 2)',
  '[!] Alert: 192.168.1.10 — unusual outbound traffic on 4444/tcp',
  '[+] Scanner: 192.168.1.30:27017 — MongoDB NO AUTH detected',
  '[+] Session #2 heartbeat OK — 192.168.1.20',
  '[+] Cracking: 10/14 hashes cracked',
  '[!] New finding: 192.168.1.40 — SMB signing disabled (lateral movement risk)',
];

function TerminalFeed() {
  const [lines, setLines] = useState<{ text: string; t: number }[]>([]);
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (idx >= FEED_MSGS.length) return;
    const timer = setTimeout(
      () => {
        setLines((prev) => [...prev.slice(-20), { text: FEED_MSGS[idx], t: Date.now() }]);
        setIdx((i) => i + 1);
      },
      900 + Math.random() * 600,
    );
    return () => clearTimeout(timer);
  }, [idx]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto font-mono text-[9px] space-y-0.5 max-h-[80px]">
      {lines.map((l, i) => (
        <div key={i} className={l.text.startsWith('[!]') ? 'text-warning' : 'text-success'}>
          {l.text}
        </div>
      ))}
      <span className="text-success animate-pulse">█</span>
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================
interface DashboardState {
  greeting: string;
}

export function Dashboard() {
  const [state] = useModulePersistence<DashboardState>('dashboard', {
    greeting:
      new Date().getHours() < 12
        ? 'Good morning'
        : new Date().getHours() < 18
          ? 'Good afternoon'
          : 'Good evening',
  });

  const { greeting } = state;

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-background font-mono">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 h-[34px] bg-background border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
          <span className="text-[9px] font-bold text-[#30d158] font-mono tracking-widest uppercase">
            System Online
          </span>
        </div>
        <div className="w-px h-3 bg-border" />
        <span className="text-[9px] text-text-secondary font-mono">{greeting}, Operator</span>
        <div className="ml-auto flex items-center gap-2">
          <LiveClock />
          <div className="w-px h-3 bg-[#1c2333]" />
          <button className="text-[9px] font-mono font-bold px-2.5 py-1 rounded border text-[#0af] border-[#0af30] bg-[#0af10]">
            ⟳ REFRESH
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2.5 bg-background space-y-2">
        {/* Row 1 — Key stats */}
        <div className="grid grid-cols-7 gap-2">
          <StatBox
            label="Risk Score"
            value={`${stats.riskScore}`}
            sub="/100 · ELEVATED"
            accent="#ff2d55"
          />
          <StatBox
            label="Vulnerabilities"
            value={stats.totalVulns}
            sub={`${stats.critical} critical`}
            accent="#ff6b35"
          />
          <StatBox
            label="Active Sessions"
            value={stats.activeSessions}
            sub="all alive"
            accent="#30d158"
            spark={[1, 1, 2, 2, 3, 3, 3]}
          />
          <StatBox
            label="Targets"
            value={stats.totalTargets}
            sub={`${targets.filter((t) => t.status === 'compromised').length} compromised`}
            accent="#0af"
          />
          <StatBox
            label="Cracked Creds"
            value={stats.crackedCreds}
            sub="14/22 hashes"
            accent="#f5a623"
            spark={[4, 6, 8, 10, 12, 13, 14]}
          />
          <StatBox
            label="Scans Done"
            value={stats.completedScans}
            sub="2 running"
            accent="#bf5af2"
          />
          <StatBox
            label="Data Exfil"
            value={stats.dataExfiltrated}
            sub="2 targets"
            accent="#ff2d55"
            spark={[0.2, 0.5, 0.8, 1.1, 1.5, 2.0, 2.3]}
          />
        </div>

        {/* Row 2 — Main panels */}
        <div className="grid grid-cols-3 gap-2">
          {/* Vuln distribution */}
          <SectionCard title="Vulnerability Distribution" accent="#ff2d55">
            <DonutChart />
            <div className="mt-2 pt-2 border-t border-border space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[8.5px] font-mono text-text-secondary w-16">Avg CVSS</span>
                <MiniBar pct={74} color="#f5a623" />
                <span className="text-[9px] font-bold font-mono text-[#f5a623]">7.4</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8.5px] font-mono text-text-secondary w-16">Exploited</span>
                <MiniBar
                  pct={Math.round(
                    (topVulns.filter((v) => v.exploited).length / topVulns.length) * 100,
                  )}
                  color="#ff2d55"
                />
                <span className="text-[9px] font-bold font-mono text-[#ff2d55]">
                  {topVulns.filter((v) => v.exploited).length}/{topVulns.length}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Activity feed */}
          <SectionCard title="Activity Timeline" accent="#0af">
            <div className="space-y-1 max-h-[190px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-0">
              {recentActivities.map((a) => {
                const c = RISK_COLOR[a.severity] ?? '#636366';
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-2 pb-1.5 border-b border-card-background last:border-0"
                  >
                    <span className="font-mono text-[8px] text-text-secondary w-12 shrink-0 mt-0.5">
                      {a.time}
                    </span>
                    <span
                      className="text-[8px] font-bold px-1 rounded shrink-0 mt-0.5"
                      style={{ color: c, background: `${c}15`, border: `1px solid ${c}25` }}
                    >
                      {a.type}
                    </span>
                    <span className="text-[9px] text-text-secondary leading-tight">
                      {a.message}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Top vulns */}
          <SectionCard title="Top Vulnerabilities" accent="#ff6b35">
            <div className="space-y-1.5">
              {topVulns.map((v, i) => {
                const c = RISK_COLOR[v.severity];
                return (
                  <div
                    key={i}
                    className="rounded p-2"
                    style={{ background: `${c}08`, border: `1px solid ${c}20` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold" style={{ color: c }}>
                        {v.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {v.exploited && (
                          <span className="text-[7px] font-bold px-1 rounded text-error bg-error/15 border border-error/30">
                            PWNED
                          </span>
                        )}
                        <span className="text-[8px] font-bold font-mono" style={{ color: c }}>
                          CVSS {v.cvss}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] font-mono text-text-secondary">{v.cve}</span>
                      <span className="text-[8px] text-primary truncate">› {v.target}</span>
                    </div>
                    <div className="mt-1 h-[2px] bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(v.cvss / 10) * 100}%`, background: c }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* Row 3 — Sessions + Modules + Targets */}
        <div className="grid grid-cols-3 gap-2">
          {/* Active sessions */}
          <SectionCard
            title={`Active Sessions · ${stats.activeSessions} online`}
            accent="#30d158"
            className="col-span-2"
          >
            <div>
              {activeSessions.map((s) => (
                <SessionRow key={s.id} s={s} />
              ))}
            </div>
          </SectionCard>

          {/* Risk gauge */}
          <SectionCard title="Engagement Status" accent="#ff2d55">
            <div className="flex flex-col items-center gap-1">
              <RiskGauge score={stats.riskScore} />
            </div>
            <div className="mt-2 space-y-1.5">
              {[
                { label: 'Exploit Success', pct: 91, color: '#30d158' },
                { label: 'Coverage', pct: 64, color: '#0af' },
                { label: 'Stealth', pct: 72, color: '#bf5af2' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-[8.5px] font-mono text-text-secondary w-20 shrink-0">
                    {item.label}
                  </span>
                  <MiniBar pct={item.pct} color={item.color} />
                  <span
                    className="text-[8.5px] font-bold font-mono w-6 text-right"
                    style={{ color: item.color }}
                  >
                    {item.pct}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Row 4 — Module status + Target map + Live feed */}
        <div className="grid grid-cols-3 gap-2">
          {/* Module status */}
          <SectionCard title="Module Status" accent="#bf5af2">
            <div className="space-y-2">
              {moduleStatus.map((m) => {
                const c = m.status === 'running' ? '#0af' : '#1c2333';
                return (
                  <div key={m.name}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] font-mono text-text-secondary">{m.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono text-[#2a3548]">
                          {m.findings} findings
                        </span>
                        <span
                          className="text-[8px] font-bold font-mono"
                          style={{ color: m.status === 'running' ? '#30d158' : '#2a3548' }}
                        >
                          {m.status === 'running' ? '● RUN' : '○ IDLE'}
                        </span>
                      </div>
                    </div>
                    <div className="h-[3px] bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${m.progress}%`, background: c }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Target list */}
          <SectionCard title="Target Inventory" accent="#0af">
            <div className="space-y-1">
              {targets.map((t, i) => {
                const c = RISK_COLOR[t.status] ?? '#636366';
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 py-1 border-b border-border last:border-0"
                  >
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />
                    <span className="font-mono text-[9.5px] text-primary w-28 shrink-0">
                      {t.host}
                    </span>
                    <span className="text-[8px] text-text-secondary w-16 shrink-0">
                      {t.os} · {t.role}
                    </span>
                    <span className="text-[8px] font-mono text-[#ff6b35] w-8 shrink-0">
                      {t.vulns}v
                    </span>
                    <span className="text-[8px] font-bold font-mono ml-auto" style={{ color: c }}>
                      {t.status.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Live terminal feed + hourly activity */}
          <SectionCard title="Live Feed" accent="#30d158">
            <div className="mb-2">
              <div className="text-[8px] font-mono text-text-secondary mb-1">
                Hourly activity (last 12h)
              </div>
              <ActivityBar data={hourlyData} />
            </div>
            <div className="border-t border-border pt-2">
              <TerminalFeed />
            </div>
          </SectionCard>
        </div>

        {/* Row 5 — Quick actions */}
        <div className="bg-card-background border border-border rounded p-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[8.5px] font-mono text-text-secondary uppercase tracking-wider mr-1">
              Quick Actions
            </span>
            {[
              { label: '▶ New Scan', color: '#0af' },
              { label: '⚡ Launch Exploit', color: '#ff2d55' },
              { label: '📄 Generate Report', color: '#30d158' },
              { label: '🎣 Start Phishing', color: '#f5a623' },
              { label: '🔓 Crack Hashes', color: '#bf5af2' },
              { label: '📤 Exfil Data', color: '#ff6b35' },
            ].map((btn) => (
              <button
                key={btn.label}
                className="text-[9px] font-mono font-bold px-2.5 py-1 rounded border border-transparent transition-all hover:opacity-90"
                style={{
                  color: btn.color,
                  borderColor: `${btn.color}30`,
                  background: `${btn.color}10`,
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
