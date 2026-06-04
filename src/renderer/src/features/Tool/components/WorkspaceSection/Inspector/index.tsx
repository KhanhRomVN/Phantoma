// src/renderer/src/features/Tool/components/WorkspaceSection/Collab/index.tsx
// ============================================================================
// COLLAB — Ghost Team Protocol · Tactical Operator Dashboard
// Aesthetic: Terminal-noir / Encrypted Comms / War Room
// ============================================================================
import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../../shared/lib/utils';

// ============================================================================
// MOCK DATA
// ============================================================================

const OP_SESSION = {
  id: 'OP-2025-0604',
  codename: 'IRON VEIL',
  started: '08:55:00',
  elapsed: '01:12:34',
};

const operators = [
  {
    id: 'op1',
    initials: 'RA',
    name: 'RedAlpha',
    role: 'Lead',
    status: 'Online',
    activity: 'Post-Exploitation',
    color: '#00aaff',
    kills: 7,
    tasks: 12,
    pings: 0,
  },
  {
    id: 'op2',
    initials: 'SX',
    name: 'ShadowX',
    role: 'Member',
    status: 'Online',
    activity: 'SQLi Automation',
    color: '#f5a623',
    kills: 4,
    tasks: 9,
    pings: 2,
  },
  {
    id: 'op3',
    initials: 'GH',
    name: 'GhostHunter',
    role: 'Member',
    status: 'Away',
    activity: 'Recon',
    color: '#bf5af2',
    kills: 3,
    tasks: 8,
    pings: 1,
  },
  {
    id: 'op4',
    initials: 'VN',
    name: 'VoidNet',
    role: 'Observer',
    status: 'Online',
    activity: 'Reporting',
    color: '#30d158',
    kills: 0,
    tasks: 5,
    pings: 0,
  },
  {
    id: 'op5',
    initials: 'PX',
    name: 'Phantom_X',
    role: 'Member',
    status: 'Busy',
    activity: 'Lateral Movement',
    color: '#ff2d55',
    kills: 5,
    tasks: 10,
    pings: 3,
  },
];

const chatMessages = [
  {
    id: 'm1',
    op: 'op1',
    time: '09:12',
    text: 'Got root on .20 via Log4Shell. Moving to DC next.',
    type: 'normal',
  },
  {
    id: 'm2',
    op: 'op2',
    time: '09:15',
    text: 'SQLi confirmed on /api/v1/login. Union-based, DB = corp_db. Dumping users table.',
    type: 'normal',
  },
  {
    id: 'm3',
    op: 'op3',
    time: '09:18',
    text: 'Found exposed .git repo at git.target.corp — cloning. Might have creds in commit history.',
    type: 'normal',
  },
  {
    id: 'm4',
    op: 'op5',
    time: '09:24',
    text: 'PsExec to FILE01 successful. Dumping SAM. C2 beacon stable via HTTPS 443.',
    type: 'normal',
  },
  {
    id: 'm5',
    op: 'op1',
    time: '09:31',
    text: '🎉 DOMAIN ADMIN — DC01! MS17-010 + hashdump. krbtgt extracted. Golden ticket ready.',
    type: 'highlight',
  },
  {
    id: 'm6',
    op: 'op2',
    time: '09:33',
    text: 'Admin hash cracked → P@ssw0rd! Also got 11 phishing creds from campaign.',
    type: 'normal',
  },
  {
    id: 'm7',
    op: 'op4',
    time: '09:35',
    text: 'Generating executive report. Adding screenshots + PoC. Share in 5.',
    type: 'normal',
  },
  {
    id: 'm8',
    op: 'sys',
    time: '09:40',
    text: 'Session #2 (192.168.1.20) shared with team. Access granted to all operators.',
    type: 'system',
  },
  {
    id: 'm9',
    op: 'op5',
    time: '09:45',
    text: 'Pivoting to 10.10.5.0/24 internal segment. Found 3 new hosts. Scanning now.',
    type: 'normal',
  },
  {
    id: 'm10',
    op: 'op3',
    time: '09:48',
    text: 'AWS keys in .git history: AKIAIOSFODNN7EXAMPLE. Bucket enum starting.',
    type: 'critical',
  },
];

const sharedSessions = [
  {
    id: 's1',
    target: '192.168.1.10',
    hostname: 'DC01',
    user: 'NT AUTHORITY\\SYSTEM',
    type: 'meterpreter',
    sharedBy: 'RedAlpha',
    health: 98,
    uptime: '00:41:22',
    pid: 4912,
  },
  {
    id: 's2',
    target: '192.168.1.20',
    hostname: 'WEB01',
    user: 'www-data',
    type: 'shell',
    sharedBy: 'RedAlpha',
    health: 72,
    uptime: '00:28:10',
    pid: 1337,
  },
  {
    id: 's3',
    target: '10.10.5.44',
    hostname: 'FILE01',
    user: 'CORP\\svc_backup',
    type: 'psexec',
    sharedBy: 'Phantom_X',
    health: 91,
    uptime: '00:12:05',
    pid: 7890,
  },
  {
    id: 's4',
    target: '10.10.5.12',
    hostname: 'SQLSRV01',
    user: 'sa',
    type: 'ssh',
    sharedBy: 'ShadowX',
    health: 55,
    uptime: '00:05:30',
    pid: 2048,
  },
];

const sharedFiles = [
  {
    id: 'f1',
    name: 'hashdump_dc01.txt',
    size: '4.2 KB',
    type: 'hashdump',
    by: 'RedAlpha',
    at: '09:35',
    downloads: 3,
    tags: ['creds', 'critical'],
  },
  {
    id: 'f2',
    name: 'network_scan.pcap',
    size: '128 MB',
    type: 'pcap',
    by: 'GhostHunter',
    at: '09:28',
    downloads: 2,
    tags: ['recon'],
  },
  {
    id: 'f3',
    name: 'phishing_creds.csv',
    size: '12 KB',
    type: 'csv',
    by: 'ShadowX',
    at: '09:40',
    downloads: 4,
    tags: ['creds'],
  },
  {
    id: 'f4',
    name: 'screenshots_dc01.zip',
    size: '8.3 MB',
    type: 'screenshot',
    by: 'RedAlpha',
    at: '09:45',
    downloads: 1,
    tags: ['evidence'],
  },
  {
    id: 'f5',
    name: 'golden_ticket.kirbi',
    size: '1.1 KB',
    type: 'ticket',
    by: 'RedAlpha',
    at: '09:32',
    downloads: 2,
    tags: ['creds', 'critical'],
  },
  {
    id: 'f6',
    name: 'aws_keys_leaked.txt',
    size: '0.3 KB',
    type: 'keys',
    by: 'GhostHunter',
    at: '09:48',
    downloads: 5,
    tags: ['creds', 'critical'],
  },
];

const activityLog = [
  {
    id: 'a1',
    ts: '09:12:22',
    op: 'op1',
    action: 'Exploit',
    details: 'Log4Shell → 192.168.1.20:8080 — session opened',
    sev: 'success',
  },
  {
    id: 'a2',
    ts: '09:14:05',
    op: 'op3',
    action: 'Recon',
    details: '47 subdomains added to target list',
    sev: 'info',
  },
  {
    id: 'a3',
    ts: '09:15:30',
    op: 'op2',
    action: 'SQLi',
    details: 'Union-based injection on /api/v1/login confirmed',
    sev: 'success',
  },
  {
    id: 'a4',
    ts: '09:18:44',
    op: 'op3',
    action: 'Git',
    details: 'Cloned exposed .git from git.target.corp',
    sev: 'warning',
  },
  {
    id: 'a5',
    ts: '09:22:10',
    op: 'op1',
    action: 'Mimikatz',
    details: 'LSASS dump — 14 hashes extracted',
    sev: 'success',
  },
  {
    id: 'a6',
    ts: '09:24:00',
    op: 'op5',
    action: 'PsExec',
    details: 'Lateral movement → FILE01 (CORP\\svc_backup)',
    sev: 'success',
  },
  {
    id: 'a7',
    ts: '09:31:00',
    op: 'op1',
    action: 'MS17-010',
    details: 'EternalBlue → DC01 SYSTEM shell + hashdump',
    sev: 'critical',
  },
  {
    id: 'a8',
    ts: '09:32:00',
    op: 'op1',
    action: 'GoldTicket',
    details: 'krbtgt hash → golden ticket forged (10y TTL)',
    sev: 'critical',
  },
  {
    id: 'a9',
    ts: '09:33:22',
    op: 'op2',
    action: 'Cracking',
    details: 'Admin NTLM cracked: P@ssw0rd! (hashcat rule-based)',
    sev: 'success',
  },
  {
    id: 'a10',
    ts: '09:40:11',
    op: 'sys',
    action: 'Share',
    details: 'Session #2 shared with team',
    sev: 'info',
  },
  {
    id: 'a11',
    ts: '09:45:00',
    op: 'op5',
    action: 'C2',
    details: 'Pivot to 10.10.5.0/24 — 3 new hosts discovered',
    sev: 'info',
  },
  {
    id: 'a12',
    ts: '09:48:33',
    op: 'op3',
    action: 'Secret',
    details: 'AWS AKIAIOSFODNN7EXAMPLE found in git commit history',
    sev: 'critical',
  },
];

const objectives = [
  {
    id: 'o1',
    title: 'Initial Access',
    owner: 'op1',
    done: true,
    priority: 'P0',
    notes: 'Log4Shell on WEB01',
  },
  {
    id: 'o2',
    title: 'Privilege Escalation',
    owner: 'op1',
    done: true,
    priority: 'P0',
    notes: 'SYSTEM via MS17-010',
  },
  {
    id: 'o3',
    title: 'Domain Admin',
    owner: 'op1',
    done: true,
    priority: 'P0',
    notes: 'DC01 compromised',
  },
  {
    id: 'o4',
    title: 'Credential Harvesting',
    owner: 'op2',
    done: true,
    priority: 'P1',
    notes: '14 hashes + phishing creds',
  },
  {
    id: 'o5',
    title: 'Lateral Movement',
    owner: 'op5',
    done: false,
    priority: 'P1',
    notes: 'Pivoting 10.10.5.0/24',
  },
  {
    id: 'o6',
    title: 'Data Exfiltration',
    owner: 'op2',
    done: false,
    priority: 'P1',
    notes: 'Pending — targeting corp_db',
  },
  {
    id: 'o7',
    title: 'Cloud Asset Enum',
    owner: 'op3',
    done: false,
    priority: 'P2',
    notes: 'AWS bucket scan running',
  },
  {
    id: 'o8',
    title: 'Persistence',
    owner: 'op5',
    done: false,
    priority: 'P2',
    notes: 'Scheduled task + registry run key',
  },
  {
    id: 'o9',
    title: 'Cover Tracks',
    owner: 'op4',
    done: false,
    priority: 'P3',
    notes: 'Log wipe pending',
  },
  {
    id: 'o10',
    title: 'Executive Report',
    owner: 'op4',
    done: false,
    priority: 'P3',
    notes: 'Draft in progress',
  },
];

// ============================================================================
// CONSTANTS
// ============================================================================
const OP_MAP = Object.fromEntries(operators.map((o) => [o.id, o]));
const OP_SYS = { initials: 'SY', name: 'System', color: '#636366' };

const STATUS_COLOR: Record<string, string> = {
  Online: '#30d158',
  Away: '#f5a623',
  Busy: '#ff2d55',
};
const SEV_COLOR: Record<string, string> = {
  critical: '#ff2d55',
  success: '#30d158',
  warning: '#f5a623',
  info: '#0af',
};
const FILE_ICON: Record<string, string> = {
  hashdump: '🔑',
  pcap: '📡',
  csv: '📋',
  screenshot: '🖼',
  ticket: '🎫',
  keys: '🗝',
};
const PRIORITY_COLOR: Record<string, string> = {
  P0: '#ff2d55',
  P1: '#ff6b35',
  P2: '#f5a623',
  P3: '#3a4558',
};

// ============================================================================
// UTILS
// ============================================================================
function OpAvatar({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' | 'lg' }) {
  const op = OP_MAP[id] ?? OP_SYS;
  const sz =
    size === 'sm'
      ? 'w-5 h-5 text-[8px]'
      : size === 'lg'
        ? 'w-9 h-9 text-[13px]'
        : 'w-7 h-7 text-[10px]';
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-bold shrink-0', sz)}
      style={{ background: `${op.color}22`, color: op.color, border: `1px solid ${op.color}40` }}
    >
      {op.initials}
    </div>
  );
}

function RiskPill({ level, children }: { level: string; children?: React.ReactNode }) {
  const c = SEV_COLOR[level.toLowerCase()] ?? '#636366';
  return (
    <span
      style={{ color: c, border: `1px solid ${c}35`, background: `${c}12` }}
      className="text-[8.5px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-sm font-mono whitespace-nowrap"
    >
      {children ?? level}
    </span>
  );
}

function Ping({ color = '#0af' }: { color?: string }) {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex rounded-full h-1.5 w-1.5"
        style={{ background: color }}
      />
    </span>
  );
}

function HealthBar({ value, width = 'w-16' }: { value: number; width?: string }) {
  const c = value >= 80 ? '#30d158' : value >= 50 ? '#f5a623' : '#ff2d55';
  return (
    <div className={cn('h-1 bg-[#111827] rounded-full overflow-hidden', width)}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${value}%`, background: c }}
      />
    </div>
  );
}

// ============================================================================
// SVG MINI CHARTS
// ============================================================================
function SparkLine({
  values,
  color = '#0af',
  height = 24,
  width = 60,
}: {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values),
    min = Math.min(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RadialProgress({
  value,
  size = 40,
  color = '#0af',
  label,
}: {
  value: number;
  size?: number;
  color?: string;
  label?: string;
}) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1c2333" strokeWidth="3.5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {label && (
        <text
          x={size / 2}
          y={size / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="8"
          fill={color}
          fontFamily="monospace"
        >
          {label}
        </text>
      )}
    </svg>
  );
}

function NetworkGraph() {
  // Mini operator network topology
  const cx = 90,
    cy = 90,
    r = 62;
  const nodes = operators.map((op, i) => {
    const angle = (i / operators.length) * Math.PI * 2 - Math.PI / 2;
    return { ...op, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
  return (
    <svg viewBox="0 0 180 180" className="w-full h-full">
      {/* center node */}
      <circle cx={cx} cy={cy} r={14} fill="#0af15" stroke="#0af35" strokeWidth="1" />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="7"
        fill="#0af"
        fontFamily="monospace"
      >
        C2
      </text>
      {/* edges */}
      {nodes.map((n) => (
        <line
          key={n.id}
          x1={cx}
          y1={cy}
          x2={n.x}
          y2={n.y}
          stroke={n.status === 'Online' ? `${n.color}40` : '#1c2333'}
          strokeWidth={n.status === 'Online' ? '1' : '0.5'}
          strokeDasharray={n.status === 'Away' ? '3,3' : undefined}
        />
      ))}
      {/* operator nodes */}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x}
            cy={n.y}
            r={10}
            fill={`${n.color}18`}
            stroke={`${n.color}50`}
            strokeWidth="1"
          />
          <text
            x={n.x}
            y={n.y + 0.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="7"
            fill={n.color}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {n.initials}
          </text>
          {n.status === 'Online' && <circle cx={n.x + 7} cy={n.y - 7} r="2.5" fill="#30d158" />}
          <text
            x={n.x}
            y={n.y + 19}
            textAnchor="middle"
            fontSize="6.5"
            fill="#3a4558"
            fontFamily="monospace"
          >
            {n.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ActivityHeatmap() {
  // 24h activity heatmap per operator (5 ops x 24 cols)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Mock activity intensities
  const data: Record<string, number[]> = {
    op1: [0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 8, 9, 7, 3, 8, 9, 6, 4, 2, 1, 0, 0, 0, 0],
    op2: [0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 7, 8, 5, 2, 6, 8, 7, 5, 3, 1, 0, 0, 0, 0],
    op3: [0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 6, 4, 2, 1, 4, 5, 3, 2, 1, 0, 0, 0, 0, 0],
    op4: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 3, 2, 3, 4, 5, 4, 3, 1, 0, 0, 0],
    op5: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 5, 7, 8, 6, 7, 8, 7, 6, 4, 2, 1, 0, 0, 0],
  };
  return (
    <div className="flex flex-col gap-[2px]">
      {operators.map((op) => (
        <div key={op.id} className="flex items-center gap-[2px]">
          <span className="text-[7.5px] font-mono w-4 shrink-0" style={{ color: op.color }}>
            {op.initials}
          </span>
          {hours.map((h) => {
            const val = data[op.id][h];
            const alpha = val === 0 ? 0.04 : 0.1 + (val / 10) * 0.9;
            return (
              <div
                key={h}
                title={`${h}:00 — ${val} actions`}
                className="w-[7px] h-[10px] rounded-sm"
                style={{
                  background: val === 0 ? '#1c2333' : op.color,
                  opacity: val === 0 ? 0.15 : alpha,
                }}
              />
            );
          })}
        </div>
      ))}
      <div className="flex items-center gap-[2px] mt-[2px] pl-5">
        {[0, 6, 12, 18, 23].map((h) => (
          <div
            key={h}
            style={{
              marginLeft:
                h === 0 ? 0 : `${(h - (h === 6 ? 0 : h === 12 ? 6 : h === 18 ? 12 : 18)) * 9}px`,
            }}
            className="text-[7px] font-mono text-[#2a3548]"
          >
            {h.toString().padStart(2, '0')}
          </div>
        ))}
      </div>
    </div>
  );
}

function ObjectivesProgress() {
  const done = objectives.filter((o) => o.done).length;
  const total = objectives.length;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <RadialProgress value={pct} size={48} color="#30d158" label={`${pct}%`} />
      <div className="flex-1">
        <div className="text-[10px] font-mono text-[#c8d6f0] font-bold">
          {done}/{total} objectives
        </div>
        <div className="h-1 bg-[#111827] rounded-full overflow-hidden mt-1">
          <div className="h-full bg-[#30d158] rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[8.5px] text-[#3a4558] font-mono mt-0.5">{total - done} pending</div>
      </div>
    </div>
  );
}

// ============================================================================
// HEADER STATS BAR
// ============================================================================
function HeaderStats() {
  const online = operators.filter((o) => o.status === 'Online').length;
  const sessions = sharedSessions.length;
  const crits = activityLog.filter((a) => a.sev === 'critical').length;
  const completedObj = objectives.filter((o) => o.done).length;
  return (
    <div className="flex items-center gap-3 px-3 h-8 bg-[#040608] border-b border-[#1c2333] text-[9px] font-mono shrink-0">
      <div className="flex items-center gap-1.5">
        <Ping color="#30d158" />
        <span className="text-[#30d158]">{online} ONLINE</span>
      </div>
      <div className="w-px h-3 bg-[#1c2333]" />
      <span className="text-[#3a4558]">
        SESSION <span className="text-[#0af]">{OP_SESSION.codename}</span>
      </span>
      <div className="w-px h-3 bg-[#1c2333]" />
      <span className="text-[#3a4558]">
        ELAPSED <span className="text-[#f5a623]">{OP_SESSION.elapsed}</span>
      </span>
      <div className="w-px h-3 bg-[#1c2333]" />
      <span className="text-[#3a4558]">
        SHELLS <span className="text-[#0af]">{sessions}</span>
      </span>
      <div className="w-px h-3 bg-[#1c2333]" />
      <span className="text-[#3a4558]">
        CRITS <span className="text-[#ff2d55]">{crits}</span>
      </span>
      <div className="w-px h-3 bg-[#1c2333]" />
      <span className="text-[#3a4558]">
        OBJ{' '}
        <span className="text-[#30d158]">
          {completedObj}/{objectives.length}
        </span>
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ff2d55] animate-pulse" />
        <span className="text-[#ff2d55]">LIVE FEED</span>
      </div>
    </div>
  );
}

// ============================================================================
// TABS
// ============================================================================

// ---- TAB: WAR ROOM (Overview) ----
function TabWarRoom() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10] grid grid-cols-3 gap-2 content-start">
      {/* Operator Network + Stats */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 flex flex-col gap-2">
        <div className="text-[8.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#3a4558] flex items-center gap-1.5">
          <div className="w-1 h-3 rounded-full bg-[#0af]" />
          Operator Network
        </div>
        <div className="w-full h-[160px]">
          <NetworkGraph />
        </div>
        <div className="space-y-1">
          {operators.map((op) => (
            <div key={op.id} className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: STATUS_COLOR[op.status] }}
              />
              <span className="text-[9px] font-mono font-bold w-20" style={{ color: op.color }}>
                {op.name}
              </span>
              <span className="text-[8.5px] text-[#3a4558] flex-1 truncate">{op.activity}</span>
              <span className="text-[8px] font-mono text-[#2a3548]">{op.kills}k</span>
            </div>
          ))}
        </div>
      </div>

      {/* Objectives */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <div className="text-[8.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#3a4558] flex items-center gap-1.5 mb-2">
          <div className="w-1 h-3 rounded-full bg-[#30d158]" />
          Mission Objectives
        </div>
        <ObjectivesProgress />
        <div className="mt-2 space-y-[3px] max-h-[200px] overflow-y-auto">
          {objectives.map((obj) => {
            const op = OP_MAP[obj.owner];
            return (
              <div
                key={obj.id}
                className="flex items-center gap-2 py-[3px] border-b border-[#111827]"
              >
                <div
                  className={cn(
                    'w-3 h-3 rounded-sm border flex items-center justify-center shrink-0',
                    obj.done ? 'border-[#30d158]' : 'border-[#2a3548]',
                  )}
                  style={{ background: obj.done ? '#30d15820' : 'transparent' }}
                >
                  {obj.done && <span className="text-[7px] text-[#30d158]">✓</span>}
                </div>
                <span
                  className={cn(
                    'text-[9px] font-mono flex-1 truncate',
                    obj.done ? 'text-[#3a4558] line-through' : 'text-[#8da0c0]',
                  )}
                >
                  {obj.title}
                </span>
                <span
                  className="text-[8px] font-mono font-bold shrink-0"
                  style={{ color: PRIORITY_COLOR[obj.priority] }}
                >
                  {obj.priority}
                </span>
                {op && (
                  <div
                    className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold shrink-0"
                    style={{ background: `${op.color}22`, color: op.color }}
                  >
                    {op.initials}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity heatmap + kill score */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <div className="text-[8.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#3a4558] flex items-center gap-1.5 mb-2">
          <div className="w-1 h-3 rounded-full bg-[#f5a623]" />
          Activity Heatmap (24h)
        </div>
        <ActivityHeatmap />
        <div className="mt-3 pt-2 border-t border-[#1c2333]">
          <div className="text-[8.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#3a4558] mb-1.5">
            Kill Score
          </div>
          {operators
            .sort((a, b) => b.kills - a.kills)
            .map((op) => (
              <div key={op.id} className="flex items-center gap-2 mb-1">
                <span className="text-[8.5px] font-mono w-5 font-bold" style={{ color: op.color }}>
                  {op.initials}
                </span>
                <div className="flex-1 h-[5px] bg-[#111827] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(op.kills / 7) * 100}%`, background: op.color }}
                  />
                </div>
                <span className="text-[8px] font-mono text-[#4a5a7a] w-4 text-right">
                  {op.kills}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <div className="text-[8.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#3a4558] flex items-center gap-1.5 mb-2">
          <div className="w-1 h-3 rounded-full bg-[#ff2d55]" />
          Live Activity Feed
          <Ping color="#ff2d55" />
        </div>
        <div className="space-y-[3px] max-h-[180px] overflow-y-auto">
          {[...activityLog]
            .reverse()
            .slice(0, 8)
            .map((log) => {
              const op = OP_MAP[log.op] ?? OP_SYS;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2 py-[3px] border-b border-[#080b10]"
                >
                  <span className="text-[8.5px] font-mono text-[#2a3548] shrink-0 w-14">
                    {log.ts}
                  </span>
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-[3px] shrink-0"
                    style={{ background: SEV_COLOR[log.sev] }}
                  />
                  <span
                    className="text-[9px] font-mono font-bold w-16 shrink-0"
                    style={{ color: op.color }}
                  >
                    {op.initials}
                  </span>
                  <span className="text-[8.5px] font-mono text-[#f5a623] w-16 shrink-0">
                    {log.action}
                  </span>
                  <span className="text-[8.5px] text-[#4a5a7a] truncate">{log.details}</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Active sessions mini */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <div className="text-[8.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#3a4558] flex items-center gap-1.5 mb-2">
          <div className="w-1 h-3 rounded-full bg-[#0af]" />
          Active Shells ({sharedSessions.length})
        </div>
        {sharedSessions.map((s) => (
          <div key={s.id} className="mb-2 pb-2 border-b border-[#111827] last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#0af]">{s.hostname}</span>
              <span className="text-[8px] font-mono text-[#2a3548]">{s.type}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[8.5px] text-[#4a5a7a] font-mono">{s.target}</span>
              <HealthBar value={s.health} />
              <span
                className="text-[8px] font-mono"
                style={{
                  color: s.health >= 80 ? '#30d158' : s.health >= 50 ? '#f5a623' : '#ff2d55',
                }}
              >
                {s.health}%
              </span>
            </div>
            <div className="text-[8px] text-[#2a3548] font-mono truncate">{s.user}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- TAB: COMMS ----
function TabComms() {
  const [msg, setMsg] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Chat */}
      <div className="flex flex-col flex-1 overflow-hidden border-r border-[#1c2333]">
        <div className="flex-1 overflow-y-auto p-2 bg-[#080b10] space-y-[2px]">
          {chatMessages.map((m) => {
            const op = m.op === 'sys' ? OP_SYS : (OP_MAP[m.op] ?? OP_SYS);
            const isSystem = m.type === 'system';
            const isHighlight = m.type === 'highlight';
            const isCrit = m.type === 'critical';
            return (
              <div
                key={m.id}
                className={cn(
                  'flex gap-2 px-2 py-1.5 rounded',
                  isHighlight && 'bg-[#30d15808] border border-[#30d15820]',
                  isCrit && 'bg-[#ff2d5508] border border-[#ff2d5520]',
                  isSystem && 'opacity-60',
                )}
              >
                {!isSystem && <OpAvatar id={m.op} size="sm" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    {!isSystem && (
                      <span className="text-[9.5px] font-bold" style={{ color: op.color }}>
                        {op.name}
                      </span>
                    )}
                    <span className="text-[8px] text-[#2a3548] font-mono">{m.time}</span>
                    {isCrit && <RiskPill level="critical">⚠ CRITICAL</RiskPill>}
                  </div>
                  <div
                    className={cn(
                      'text-[9.5px] leading-5',
                      isSystem
                        ? 'text-[#3a4558] italic'
                        : isHighlight
                          ? 'text-[#30d158]'
                          : isCrit
                            ? 'text-[#ff2d55]'
                            : 'text-[#8da0c0]',
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div className="p-2 border-t border-[#1c2333] bg-[#040608] shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Encrypted message... (/ for commands)"
              className="flex-1 h-8 bg-[#0d1017] border border-[#1c2333] rounded text-[10px] text-[#8da0c0] px-3 outline-none placeholder:text-[#2a3548] font-mono"
            />
            <button className="px-3 h-8 bg-[#0af15] border border-[#0af30] text-[#0af] text-[9px] font-bold uppercase tracking-wider rounded font-mono hover:bg-[#0af25] transition-colors">
              Send
            </button>
          </div>
          <div className="flex gap-2 mt-1">
            {['/share_session', '/share_file', '/status', '/kick', '/enc'].map((cmd) => (
              <button
                key={cmd}
                onClick={() => setMsg(cmd + ' ')}
                className="text-[8px] font-mono text-[#2a3548] hover:text-[#4a5a7a] transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Operator presence panel */}
      <div className="w-44 shrink-0 bg-[#080b10] p-2 overflow-y-auto">
        <div className="text-[8px] uppercase tracking-wider text-[#2a3548] font-mono mb-2">
          Operators ({operators.length})
        </div>
        {operators.map((op) => (
          <div key={op.id} className="flex items-center gap-1.5 mb-2">
            <OpAvatar id={op.id} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span
                  className="text-[9px] font-mono font-bold truncate"
                  style={{ color: op.color }}
                >
                  {op.name}
                </span>
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: STATUS_COLOR[op.status] }}
                />
              </div>
              <div className="text-[7.5px] text-[#2a3548] truncate">{op.activity}</div>
            </div>
          </div>
        ))}
        <div className="mt-3 pt-2 border-t border-[#1c2333]">
          <div className="text-[8px] uppercase tracking-wider text-[#2a3548] font-mono mb-1.5">
            Ping Alerts
          </div>
          {operators
            .filter((o) => o.pings > 0)
            .map((op) => (
              <div key={op.id} className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono" style={{ color: op.color }}>
                  {op.initials}
                </span>
                <span className="text-[8px] font-mono bg-[#ff2d5520] text-[#ff2d55] px-1.5 rounded-full">
                  {op.pings}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ---- TAB: SESSIONS ----
function TabSessions() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2 mb-3">
        {sharedSessions.map((s) => {
          const hc = s.health >= 80 ? '#30d158' : s.health >= 50 ? '#f5a623' : '#ff2d55';
          const tc =
            s.type === 'meterpreter'
              ? '#0af'
              : s.type === 'psexec'
                ? '#bf5af2'
                : s.type === 'ssh'
                  ? '#30d158'
                  : '#f5a623';
          return (
            <div
              key={s.id}
              className="bg-[#0d1017] border border-[#1c2333] rounded p-3 relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(90deg, ${tc}80, transparent)` }}
              />
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[12px] font-bold font-mono" style={{ color: tc }}>
                    {s.hostname}
                  </div>
                  <div className="text-[9px] text-[#3a4558] font-mono">{s.target}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="text-[8.5px] font-bold font-mono px-1.5 py-0.5 rounded"
                    style={{ background: `${tc}15`, color: tc, border: `1px solid ${tc}30` }}
                  >
                    {s.type.toUpperCase()}
                  </span>
                  <span className="text-[8px] font-mono text-[#2a3548]">PID {s.pid}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 text-[9px] font-mono mb-2">
                <div>
                  <span className="text-[#2a3548]">user </span>
                  <span className="text-[#f5a623] text-[8px]">{s.user.split('\\').pop()}</span>
                </div>
                <div>
                  <span className="text-[#2a3548]">uptime </span>
                  <span className="text-[#8da0c0]">{s.uptime}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[#2a3548]">by </span>
                  <span
                    style={{
                      color:
                        OP_MAP[operators.find((o) => o.name === s.sharedBy)?.id ?? '']?.color ??
                        '#8da0c0',
                    }}
                  >
                    {s.sharedBy}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[#111827] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.health}%`, background: hc }}
                  />
                </div>
                <span className="text-[9px] font-mono font-bold" style={{ color: hc }}>
                  {s.health}%
                </span>
              </div>
              <div className="flex gap-1.5 mt-2">
                <button
                  className="flex-1 h-6 text-[8.5px] font-bold font-mono uppercase tracking-wider rounded transition-colors"
                  style={{ background: `${tc}15`, color: tc, border: `1px solid ${tc}30` }}
                >
                  Interact
                </button>
                <button className="h-6 px-2 text-[8.5px] font-mono text-[#3a4558] bg-[#111827] rounded border border-[#1c2333] hover:text-[#8da0c0] transition-colors">
                  Logs
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Session table summary */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <div className="text-[8.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#3a4558] mb-2">
          Session Registry
        </div>
        <table className="w-full text-[9.5px] font-mono">
          <thead>
            <tr className="border-b border-[#1c2333]">
              {[
                '#',
                'Target',
                'Host',
                'User',
                'Type',
                'Health',
                'Uptime',
                'Shared By',
                'Actions',
              ].map((h) => (
                <th
                  key={h}
                  className="text-left pb-1.5 text-[#2a3548] font-normal text-[8.5px] uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sharedSessions.map((s, i) => {
              const tc =
                s.type === 'meterpreter'
                  ? '#0af'
                  : s.type === 'psexec'
                    ? '#bf5af2'
                    : s.type === 'ssh'
                      ? '#30d158'
                      : '#f5a623';
              const hc = s.health >= 80 ? '#30d158' : s.health >= 50 ? '#f5a623' : '#ff2d55';
              return (
                <tr
                  key={s.id}
                  className="border-b border-[#080b10] hover:bg-[#111827] transition-colors"
                >
                  <td className="py-1.5 text-[#2a3548]">{i + 1}</td>
                  <td className="py-1.5 text-[#0af]">{s.target}</td>
                  <td className="py-1.5 font-bold" style={{ color: tc }}>
                    {s.hostname}
                  </td>
                  <td className="py-1.5 text-[#f5a623] text-[8.5px]">{s.user.split('\\').pop()}</td>
                  <td className="py-1.5">
                    <span style={{ color: tc }}>{s.type}</span>
                  </td>
                  <td className="py-1.5">
                    <span style={{ color: hc }}>{s.health}%</span>
                  </td>
                  <td className="py-1.5 text-[#4a5a7a]">{s.uptime}</td>
                  <td
                    className="py-1.5"
                    style={{
                      color:
                        OP_MAP[operators.find((o) => o.name === s.sharedBy)?.id ?? '']?.color ??
                        '#8da0c0',
                    }}
                  >
                    {s.sharedBy}
                  </td>
                  <td className="py-1.5">
                    <button
                      className="text-[8px] px-1.5 py-0.5 rounded font-mono"
                      style={{ background: `${tc}15`, color: tc, border: `1px solid ${tc}30` }}
                    >
                      ↗
                    </button>
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

// ---- TAB: FILES ----
function TabFiles() {
  const [filter, setFilter] = useState('');
  const filtered = sharedFiles.filter(
    (f) =>
      f.name.includes(filter) ||
      f.by.toLowerCase().includes(filter.toLowerCase()) ||
      f.tags.some((t) => t.includes(filter)),
  );
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="flex items-center gap-2 mb-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter files..."
          className="flex-1 h-7 bg-[#0d1017] border border-[#1c2333] rounded text-[10px] text-[#8da0c0] px-2 font-mono outline-none placeholder:text-[#2a3548]"
        />
        <button className="h-7 px-3 bg-[#0af15] border border-[#0af30] text-[#0af] text-[8.5px] font-bold font-mono uppercase rounded hover:bg-[#0af25] transition-colors">
          Upload
        </button>
      </div>

      {/* File grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {filtered.map((f) => {
          const isCrit = f.tags.includes('critical');
          const bc = isCrit ? '#ff2d55' : '#1c2333';
          return (
            <div
              key={f.id}
              className="bg-[#0d1017] rounded p-2.5 border relative overflow-hidden group cursor-default"
              style={{ borderColor: `${bc}40` }}
            >
              {isCrit && <div className="absolute top-0 left-0 right-0 h-px bg-[#ff2d55]" />}
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-[16px]">{FILE_ICON[f.type] ?? '📄'}</span>
                <div className="flex flex-wrap gap-0.5 justify-end">
                  {f.tags.map((t) => (
                    <span
                      key={t}
                      className={cn(
                        'text-[7px] font-mono px-1 py-0.5 rounded',
                        t === 'critical'
                          ? 'bg-[#ff2d5520] text-[#ff2d55] border border-[#ff2d5530]'
                          : 'bg-[#111827] text-[#3a4558]',
                      )}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-[9.5px] font-mono font-bold text-[#8da0c0] truncate mb-0.5">
                {f.name}
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono text-[#2a3548]">
                <span>{f.size}</span>
                <span>{f.downloads}↓</span>
              </div>
              <div className="text-[8px] font-mono text-[#2a3548] mt-0.5">
                {f.by} · {f.at}
              </div>
              <button
                className="mt-1.5 w-full h-5 text-[8px] font-mono font-bold uppercase tracking-wider rounded opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: '#0af15', color: '#0af', border: '1px solid #0af30' }}
              >
                Download
              </button>
            </div>
          );
        })}
      </div>

      {/* File table */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <div className="text-[8.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#3a4558] mb-2">
          File Registry
        </div>
        <table className="w-full text-[9.5px] font-mono">
          <thead>
            <tr className="border-b border-[#1c2333]">
              {['Name', 'Size', 'Type', 'Shared By', 'Time', 'Downloads', 'Tags', ''].map((h) => (
                <th
                  key={h}
                  className="text-left pb-1.5 text-[#2a3548] font-normal text-[8.5px] uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr
                key={f.id}
                className="border-b border-[#080b10] hover:bg-[#111827] transition-colors"
              >
                <td className="py-1.5 font-mono text-[#0af] truncate max-w-[140px]">{f.name}</td>
                <td className="py-1.5 text-[#3a4558]">{f.size}</td>
                <td className="py-1.5 text-[#4a5a7a]">
                  {FILE_ICON[f.type]} {f.type}
                </td>
                <td
                  className="py-1.5"
                  style={{
                    color:
                      OP_MAP[operators.find((o) => o.name === f.by)?.id ?? '']?.color ?? '#8da0c0',
                  }}
                >
                  {f.by}
                </td>
                <td className="py-1.5 text-[#2a3548]">{f.at}</td>
                <td className="py-1.5 text-[#4a5a7a]">{f.downloads}</td>
                <td className="py-1.5">
                  <div className="flex gap-0.5">
                    {f.tags.map((t) => (
                      <RiskPill key={t} level={t === 'critical' ? 'critical' : 'none'}>
                        {t}
                      </RiskPill>
                    ))}
                  </div>
                </td>
                <td className="py-1.5">
                  <button className="text-[8px] px-1.5 py-0.5 bg-[#0af15] text-[#0af] border border-[#0af30] rounded font-mono">
                    ↓
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- TAB: OPERATORS ----
function TabOperators() {
  const actPerOp = (id: string) => activityLog.filter((a) => a.op === id).length;
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-5 gap-2 mb-3">
        {operators.map((op) => (
          <div
            key={op.id}
            className="bg-[#0d1017] border rounded p-3 relative overflow-hidden"
            style={{ borderColor: `${op.color}30` }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, ${op.color}60, transparent)` }}
            />
            <div className="flex items-center gap-2 mb-2">
              <OpAvatar id={op.id} size="lg" />
              <div>
                <div className="text-[11px] font-bold font-mono" style={{ color: op.color }}>
                  {op.name}
                </div>
                <div className="text-[8.5px] font-mono text-[#3a4558]">{op.role}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: STATUS_COLOR[op.status] }}
              />
              <span className="text-[8.5px] font-mono" style={{ color: STATUS_COLOR[op.status] }}>
                {op.status}
              </span>
            </div>
            <div className="text-[8.5px] text-[#3a4558] font-mono mb-2 truncate">{op.activity}</div>
            <div className="grid grid-cols-3 gap-1 text-center">
              {[
                ['kills', op.kills],
                ['tasks', op.tasks],
                ['actions', actPerOp(op.id)],
              ].map(([l, v]) => (
                <div key={l} className="bg-[#080b10] rounded p-1">
                  <div className="text-[11px] font-bold font-mono" style={{ color: op.color }}>
                    {v}
                  </div>
                  <div className="text-[7px] text-[#2a3548] uppercase tracking-wider">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-[7.5px] font-mono text-[#2a3548] mb-0.5">
                <span>Task completion</span>
                <span>{Math.round((op.kills / op.tasks) * 100)}%</span>
              </div>
              <div className="h-1 bg-[#111827] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(op.kills / op.tasks) * 100}%`, background: op.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Role permissions */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <div className="text-[8.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#3a4558] mb-2">
          Role Access Matrix
        </div>
        <table className="w-full text-[9.5px] font-mono">
          <thead>
            <tr className="border-b border-[#1c2333]">
              <th className="text-left pb-1.5 text-[#2a3548] font-normal text-[8.5px] uppercase">
                Operator
              </th>
              {['Recon', 'Exploit', 'Post-Exploit', 'Pivot', 'Reporting', 'Admin'].map((cap) => (
                <th
                  key={cap}
                  className="text-center pb-1.5 text-[#2a3548] font-normal text-[8.5px] uppercase"
                >
                  {cap}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {operators.map((op) => {
              const perms = {
                Lead: [true, true, true, true, true, true],
                Member: [true, true, true, true, false, false],
                Observer: [true, false, false, false, true, false],
              };
              const p = perms[op.role];
              return (
                <tr key={op.id} className="border-b border-[#080b10]">
                  <td className="py-1.5 font-bold" style={{ color: op.color }}>
                    {op.name}
                  </td>
                  {p.map((ok, i) => (
                    <td key={i} className="py-1.5 text-center">
                      {ok ? (
                        <span className="text-[#30d158] text-[11px]">✓</span>
                      ) : (
                        <span className="text-[#2a3548] text-[11px]">✗</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- TAB: ACTIVITY LOG ----
function TabActivityLog() {
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState<string | null>(null);
  const filtered = activityLog.filter((l) => {
    const op = OP_MAP[l.op] ?? OP_SYS;
    const matchText =
      !search ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      op.name.toLowerCase().includes(search.toLowerCase());
    const matchSev = !sevFilter || l.sev === sevFilter;
    return matchText && matchSev;
  });

  const sevCounts = ['critical', 'success', 'warning', 'info'].map((s) => ({
    sev: s,
    count: activityLog.filter((l) => l.sev === s).length,
  }));

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {sevCounts.map(({ sev, count }) => (
          <button
            key={sev}
            onClick={() => setSevFilter(sevFilter === sev ? null : sev)}
            className={cn(
              'bg-[#0d1017] border rounded p-2 text-center transition-all',
              sevFilter === sev ? 'opacity-100' : 'opacity-70 hover:opacity-90',
            )}
            style={{ borderColor: sevFilter === sev ? SEV_COLOR[sev] : `${SEV_COLOR[sev]}25` }}
          >
            <div className="text-[16px] font-bold font-mono" style={{ color: SEV_COLOR[sev] }}>
              {count}
            </div>
            <div className="text-[8px] uppercase tracking-wider text-[#3a4558] font-mono">
              {sev}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="flex-1 h-7 bg-[#0d1017] border border-[#1c2333] rounded text-[10px] text-[#8da0c0] px-2 font-mono outline-none placeholder:text-[#2a3548]"
        />
        {sevFilter && (
          <button
            onClick={() => setSevFilter(null)}
            className="h-7 px-2.5 text-[8.5px] font-mono text-[#ff2d55] border border-[#ff2d5530] bg-[#ff2d5510] rounded hover:bg-[#ff2d5520] transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
        <table className="w-full text-[9.5px] font-mono">
          <thead className="bg-[#040608]">
            <tr className="border-b border-[#1c2333]">
              {['Timestamp', 'Operator', 'Action', 'Details', 'Sev'].map((h) => (
                <th
                  key={h}
                  className="text-left p-2 text-[#2a3548] font-normal text-[8.5px] uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => {
              const op = OP_MAP[log.op] ?? OP_SYS;
              return (
                <tr
                  key={log.id}
                  className="border-b border-[#080b10] hover:bg-[#111827] transition-colors"
                >
                  <td className="p-2 text-[#2a3548]">{log.ts}</td>
                  <td className="p-2 font-bold" style={{ color: op.color }}>
                    {op.name}
                  </td>
                  <td className="p-2 text-[#f5a623]">{log.action}</td>
                  <td className="p-2 text-[#4a5a7a] max-w-xs">{log.details}</td>
                  <td className="p-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: SEV_COLOR[log.sev] }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sparkline per operator */}
      <div className="mt-3 bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <div className="text-[8.5px] font-bold tracking-[0.12em] uppercase font-mono text-[#3a4558] mb-2">
          Action Rate (per operator)
        </div>
        <div className="flex gap-4">
          {operators.map((op) => {
            // Simulate sparkline data from activityLog timestamps
            const opLogs = activityLog.filter((a) => a.op === op.id);
            const vals = [0, 1, 2, 3, 4, 5, 6, 7].map(
              (i) => opLogs.filter((_, li) => li % 8 === i).length + Math.floor(Math.random() * 2),
            );
            return (
              <div key={op.id} className="flex flex-col items-center gap-1">
                <SparkLine values={vals} color={op.color} width={55} height={20} />
                <span className="text-[7.5px] font-mono" style={{ color: op.color }}>
                  {op.initials}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN
// ============================================================================
const TABS = [
  { id: 'warroom', label: 'War Room', accent: '#0af' },
  { id: 'comms', label: 'Comms', accent: '#30d158' },
  { id: 'sessions', label: 'Sessions', accent: '#bf5af2' },
  { id: 'files', label: 'Files', accent: '#f5a623' },
  { id: 'operators', label: 'Operators', accent: '#ff6b35' },
  { id: 'log', label: 'Activity Log', accent: '#ff2d55' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function Collab() {
  const [active, setActive] = useState<TabId>('warroom');

  const renderContent = () => {
    switch (active) {
      case 'warroom':
        return <TabWarRoom />;
      case 'comms':
        return <TabComms />;
      case 'sessions':
        return <TabSessions />;
      case 'files':
        return <TabFiles />;
      case 'operators':
        return <TabOperators />;
      case 'log':
        return <TabActivityLog />;
    }
  };

  const activeTab = TABS.find((t) => t.id === active)!;

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden bg-[#080b10]"
      style={{ fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace' }}
    >
      {/* Tab bar */}
      <div className="flex items-center gap-0 px-3 h-[34px] bg-[#060810] border-b border-[#1c2333] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              'h-full px-3 text-[9.5px] uppercase tracking-[0.1em] font-bold transition-all relative whitespace-nowrap',
              active === tab.id ? 'text-[#c8d6f0]' : 'text-[#2a3548] hover:text-[#4a5a7a]',
            )}
          >
            {tab.label}
            {active === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: activeTab.accent }}
              />
            )}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[8.5px] font-mono text-[#2a3548]">
            OP <span className="text-[#f5a623]">{OP_SESSION.codename}</span>
          </span>
          <div className="w-px h-3 bg-[#1c2333]" />
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
            <span className="text-[9px] text-[#30d158] font-mono">
              {operators.filter((o) => o.status === 'Online').length} ONLINE
            </span>
          </div>
          <div className="w-px h-3 bg-[#1c2333]" />
          <button className="h-5 px-2.5 bg-[#ff2d5515] border border-[#ff2d5530] text-[#ff2d55] text-[8.5px] font-bold uppercase tracking-wider rounded font-mono hover:bg-[#ff2d5525] transition-colors">
            ⊗ End Session
          </button>
        </div>
      </div>

      {/* Sub-stats bar */}
      <HeaderStats />

      {/* Content */}
      {renderContent()}
    </div>
  );
}
