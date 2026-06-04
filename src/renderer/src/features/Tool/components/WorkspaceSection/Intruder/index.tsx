// src/renderer/src/features/Tool/components/WorkspaceSection/Intruder/IntruderV2.tsx
// ============================================================================
// INTRUDER V2 — Ghost Protocol Fuzzing Engine
// Aesthetic: Terminal-noir / Tactical Attack Interface
// ============================================================================
import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../../shared/lib/utils';

// ============================================================================
// TYPES
// ============================================================================
interface AttackResult {
  id: number;
  username: string;
  password: string;
  status: number;
  length: number;
  time: string;
  hit: boolean;
  grepMatches?: string[];
}

interface PayloadSet {
  position: number;
  name: string;
  type: string;
  entries: string[];
  total: number;
  source: string;
}

interface GrepExtract {
  payload: string;
  extracted: string;
  occurrence: number;
}

// ============================================================================
// MOCK DATA
// ============================================================================
const attackResults: AttackResult[] = [
  {
    id: 241,
    username: 'admin',
    password: 'admin123',
    status: 200,
    length: 1432,
    time: '142ms',
    hit: true,
    grepMatches: ['Welcome admin', 'token: eyJhbGciOiJ...'],
  },
  {
    id: 388,
    username: 'administrator',
    password: 'P@ssw0rd!',
    status: 200,
    length: 1432,
    time: '138ms',
    hit: true,
    grepMatches: ['Welcome administrator'],
  },
  {
    id: 512,
    username: 'superadmin',
    password: 'sup3r@dmin',
    status: 200,
    length: 1432,
    time: '155ms',
    hit: true,
    grepMatches: ['Welcome superadmin', 'role: superadmin'],
  },
  {
    id: 1,
    username: 'admin',
    password: '123456',
    status: 401,
    length: 89,
    time: '44ms',
    hit: false,
  },
  {
    id: 2,
    username: 'admin',
    password: 'password',
    status: 401,
    length: 89,
    time: '41ms',
    hit: false,
  },
  {
    id: 3,
    username: 'admin',
    password: 'letmein',
    status: 401,
    length: 89,
    time: '43ms',
    hit: false,
  },
  {
    id: 4,
    username: 'admin',
    password: 'qwerty',
    status: 401,
    length: 89,
    time: '40ms',
    hit: false,
  },
  {
    id: 5,
    username: 'admin',
    password: 'baseball',
    status: 401,
    length: 89,
    time: '42ms',
    hit: false,
  },
  {
    id: 6,
    username: 'admin',
    password: 'dragon',
    status: 401,
    length: 89,
    time: '39ms',
    hit: false,
  },
  {
    id: 100,
    username: 'root',
    password: 'toor',
    status: 401,
    length: 89,
    time: '42ms',
    hit: false,
  },
  {
    id: 101,
    username: 'root',
    password: 'root',
    status: 401,
    length: 89,
    time: '41ms',
    hit: false,
  },
  {
    id: 200,
    username: 'user',
    password: 'user',
    status: 403,
    length: 61,
    time: '38ms',
    hit: false,
  },
  {
    id: 421,
    username: 'test',
    password: 'test123',
    status: 200,
    length: 568,
    time: '95ms',
    hit: false,
    grepMatches: ['test page'],
  },
  {
    id: 422,
    username: 'demo',
    password: 'demo',
    status: 302,
    length: 210,
    time: '67ms',
    hit: false,
  },
  {
    id: 500,
    username: 'devops',
    password: 'devops2025!',
    status: 401,
    length: 89,
    time: '40ms',
    hit: false,
  },
  {
    id: 601,
    username: 'service',
    password: 'Serv!ce#1',
    status: 401,
    length: 89,
    time: '39ms',
    hit: false,
  },
];

const payloadSets: PayloadSet[] = [
  {
    position: 1,
    name: 'usernames',
    type: 'simple',
    entries: [
      'admin',
      'administrator',
      'root',
      'user',
      'test',
      'demo',
      'guest',
      'support',
      'superadmin',
      'devops',
      'service',
      'operator',
    ],
    total: 847,
    source: 'usernames.txt',
  },
  {
    position: 2,
    name: 'passwords',
    type: 'simple',
    entries: [
      '123456',
      'password',
      'admin123',
      'P@ssw0rd!',
      'letmein',
      'qwerty',
      'baseball',
      'dragon',
      'sup3r@dmin',
      'devops2025!',
      'Serv!ce#1',
      'iloveyou',
    ],
    total: 500,
    source: 'top-500-passwords.txt',
  },
];

const attackConfig = {
  attackType: 'cluster_bomb' as const,
  threads: 25,
  delay: 0,
  followRedirects: true,
  encodePayload: true,
  encodeUrl: true,
  matchStatusCodes: [200, 302],
  excludeStatusCodes: [404, 403],
  excludeLengths: [89, 61],
  matchRegexes: ['Welcome', 'token:'],
  grepMatchRegexes: [
    { regex: '"token":"([a-zA-Z0-9_.\\-]+)"', captureGroup: 1 },
    { regex: 'Welcome ([a-zA-Z0-9_]+)', captureGroup: 1 },
    { regex: '"role":"([a-zA-Z0-9_]+)"', captureGroup: 1 },
  ],
};

const grepExtracts: GrepExtract[] = [
  {
    payload: 'admin:admin123',
    extracted:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIn0.abc',
    occurrence: 241,
  },
  {
    payload: 'administrator:P@ssw0rd!',
    extracted:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluaXN0cmF0b3IiLCJyb2xlIjoiYWRtaW4ifQ.xyz',
    occurrence: 388,
  },
  {
    payload: 'superadmin:sup3r@dmin',
    extracted:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InN1cGVyYWRtaW4iLCJyb2xlIjoic3VwZXJhZG1pbiJ9.def',
    occurrence: 512,
  },
];

const LOG_LINES = [
  { ts: '10:00:01', level: 'info', msg: 'Intruder attack started — Cluster Bomb mode' },
  { ts: '10:00:01', level: 'info', msg: 'Payload[1] usernames: 847 entries loaded' },
  { ts: '10:00:01', level: 'info', msg: 'Payload[2] passwords: 500 entries loaded' },
  { ts: '10:00:01', level: 'info', msg: 'Total combinations: 423,500 · Threads: 25' },
  { ts: '10:00:02', level: 'req', msg: '#1 admin:123456 → 401 (89 bytes, 44ms)' },
  { ts: '10:00:02', level: 'req', msg: '#2 admin:password → 401 (89 bytes, 41ms)' },
  { ts: '10:00:03', level: 'hit', msg: '#241 admin:admin123 → 200 (1432 bytes) ✓ HIT' },
  {
    ts: '10:00:03',
    level: 'grep',
    msg: 'Extracted token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  { ts: '10:00:04', level: 'hit', msg: '#388 administrator:P@ssw0rd! → 200 (1432 bytes) ✓ HIT' },
  {
    ts: '10:00:04',
    level: 'grep',
    msg: 'Extracted token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  { ts: '10:00:05', level: 'hit', msg: '#512 superadmin:sup3r@dmin → 200 (1432 bytes) ✓ HIT' },
  { ts: '10:00:05', level: 'grep', msg: 'Extracted role: superadmin' },
  { ts: '10:00:06', level: 'progress', msg: 'Progress: 1,240 / 423,500 (0.29%) · ETA 2h 14m' },
  { ts: '10:00:07', level: 'req', msg: '#1240 guest:dragon → 401 (89 bytes, 39ms)' },
  { ts: '10:00:08', level: 'progress', msg: 'Req/sec: 147 · Hits: 3 · Errors: 0' },
];

// Status code distribution for sparkline
const statusDist = [
  { code: 200, count: 3, color: '#30d158' },
  { code: 302, count: 1, color: '#f5a623' },
  { code: 401, count: 11, color: '#ff2d55' },
  { code: 403, count: 1, color: '#ff6b35' },
];

// Timeline spark data — cumulative requests over time
const timelineData = [0, 40, 140, 280, 450, 620, 810, 1020, 1130, 1180, 1220, 1240];

// ============================================================================
// CONSTANTS
// ============================================================================
const ATTACK_MODES = [
  { id: 'sniper', label: 'Sniper', desc: 'One position, one list', color: '#0af' },
  {
    id: 'battering_ram',
    label: 'Battering Ram',
    desc: 'All positions, same payload',
    color: '#bf5af2',
  },
  { id: 'pitchfork', label: 'Pitchfork', desc: 'Multiple lists, parallel', color: '#f5a623' },
  { id: 'cluster_bomb', label: 'Cluster Bomb', desc: 'All combos of all lists', color: '#ff2d55' },
] as const;

// ============================================================================
// UTILS
// ============================================================================
const statusColor = (code: number): string => {
  if (code === 200) return '#30d158';
  if (code === 301 || code === 302) return '#f5a623';
  if (code >= 400 && code < 500) return '#ff2d55';
  if (code >= 500) return '#bf5af2';
  return '#636366';
};

const logColor = (level: string): string => {
  if (level === 'hit') return '#30d158';
  if (level === 'grep') return '#f5a623';
  if (level === 'progress') return '#0af';
  if (level === 'req') return '#4a5a7a';
  return '#3a4558';
};

// ============================================================================
// SVG COMPONENTS
// ============================================================================
function Sparkline({
  data,
  color = '#0af',
  h = 24,
}: {
  data: number[];
  color?: string;
  h?: number;
}) {
  const max = Math.max(...data, 1);
  const w = 200;
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
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle
        cx={((data.length - 1) / (data.length - 1)) * w}
        cy={h - (data[data.length - 1] / max) * (h - 2)}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

function StatusDonut() {
  const total = statusDist.reduce((a, b) => a + b.count, 0);
  const r = 22,
    circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 56 56" className="w-14 h-14 shrink-0">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#111827" strokeWidth="7" />
        {statusDist.map((s, i) => {
          const pct = s.count / total;
          const dash = pct * circ;
          const el = (
            <circle
              key={i}
              cx="28"
              cy="28"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="7"
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 28 28)"
            />
          );
          offset += dash;
          return el;
        })}
        <text
          x="28"
          y="31"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="#c8d6f0"
          fontFamily="monospace"
        >
          {total}
        </text>
      </svg>
      <div className="space-y-0.5">
        {statusDist.map((s) => (
          <div key={s.code} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="font-mono text-[9px]" style={{ color: s.color }}>
              {s.code}
            </span>
            <span className="text-[9px] text-[#2a3548] font-mono ml-1">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HitRateBar({ hits, total }: { hits: number; total: number }) {
  const pct = (hits / total) * 100;
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-[8.5px] font-mono text-[#2a3548]">Hit Rate</span>
        <span className="text-[9px] font-bold font-mono text-[#30d158]">
          {hits}/{total} ({pct.toFixed(2)}%)
        </span>
      </div>
      <div className="h-[3px] bg-[#111827] rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-[#30d158]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ============================================================================
// SHARED UI
// ============================================================================
function SectionHeader({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <div className="w-[3px] h-3 rounded-full" style={{ background: accent ?? '#0af' }} />
      <span className="text-[9px] font-bold tracking-[0.12em] uppercase font-mono text-[#3a4558]">
        {children}
      </span>
    </div>
  );
}

function KV({ k, v, vc }: { k: string; v: string; vc?: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-[3px] border-b border-[#111827] last:border-0">
      <span className="text-[9px] text-[#2a3548] font-mono shrink-0">{k}</span>
      <span className={cn('text-[9.5px] font-mono text-right break-all', vc ?? 'text-[#6a7a9a]')}>
        {v}
      </span>
    </div>
  );
}

function Card({
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
      className={cn('bg-[#0d1017] border border-[#1c2333] rounded p-3', className)}
      style={accent ? { borderColor: `${accent}25` } : undefined}
    >
      {children}
    </div>
  );
}

// ============================================================================
// ATTACK MODE SELECTOR
// ============================================================================
function AttackModeBar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex items-center gap-1 px-3 h-[34px] bg-[#060810] border-b border-[#1c2333] shrink-0">
      <span className="text-[8.5px] font-mono text-[#2a3548] uppercase tracking-wider mr-2">
        Mode
      </span>
      {ATTACK_MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={cn(
            'px-2.5 h-5 rounded text-[8.5px] font-bold font-mono uppercase tracking-wider transition-all border',
            active === m.id
              ? 'text-[#080b10]'
              : 'text-[#2a3548] border-transparent hover:text-[#4a5a7a]',
          )}
          style={
            active === m.id
              ? { background: m.color, borderColor: m.color }
              : { borderColor: '#1c2333' }
          }
          title={m.desc}
        >
          {m.label}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-1.5">
        <button
          className="px-3 h-6 rounded text-[9px] font-bold font-mono border transition-all"
          style={{ color: '#30d158', borderColor: '#30d15830', background: '#30d15812' }}
        >
          ▶ START
        </button>
        <button
          className="px-2.5 h-6 rounded text-[9px] font-bold font-mono border transition-all"
          style={{ color: '#ff2d55', borderColor: '#ff2d5530', background: '#ff2d5510' }}
        >
          ■ STOP
        </button>
        <div className="w-px h-3 bg-[#1c2333] mx-1" />
        <button className="px-2 h-6 rounded text-[9px] font-mono border border-[#1c2333] text-[#2a3548] hover:text-[#4a5a7a] transition-colors">
          Export
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: ATTACK RESULTS
// ============================================================================
function TabResults() {
  const [hitsOnly, setHitsOnly] = useState(false);
  const [selected, setSelected] = useState<AttackResult | null>(null);
  const hits = attackResults.filter((r) => r.hit);
  const displayed = hitsOnly ? hits : attackResults;
  const progress = 0.29;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 bg-[#080b10] border-b border-[#1c2333] shrink-0">
        <div className="flex items-center gap-2">
          <StatusDonut />
          <div className="space-y-1 min-w-[120px]">
            <HitRateBar hits={hits.length} total={attackResults.length} />
            <div className="flex justify-between">
              <span className="text-[8.5px] font-mono text-[#2a3548]">Progress</span>
              <span className="text-[9px] font-bold font-mono text-[#0af]">{progress}%</span>
            </div>
            <div className="h-[3px] bg-[#111827] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#0af]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[8.5px] font-mono text-[#2a3548] mb-0.5">Requests / time</div>
          <Sparkline data={timelineData} color="#0af" h={28} />
        </div>
        <div className="grid grid-cols-3 gap-3 shrink-0">
          {[
            { label: 'Sent', value: '1,240', color: '#c8d6f0' },
            { label: 'Hits', value: hits.length.toString(), color: '#30d158' },
            { label: 'ETA', value: '2h 14m', color: '#f5a623' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-[16px] font-bold font-mono" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="text-[8px] font-mono text-[#2a3548] uppercase">{s.label}</div>
            </div>
          ))}
        </div>
        {/* Filter toggle */}
        <button
          onClick={() => setHitsOnly(!hitsOnly)}
          className={cn(
            'px-2.5 h-6 text-[9px] font-bold font-mono rounded border transition-all shrink-0',
            hitsOnly
              ? 'text-[#30d158] border-[#30d15830] bg-[#30d15812]'
              : 'text-[#2a3548] border-[#1c2333] hover:text-[#4a5a7a]',
          )}
        >
          {hitsOnly ? '● HITS ONLY' : '○ ALL'}
        </button>
      </div>

      {/* Table + detail pane */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[10px] font-mono">
            <thead className="sticky top-0 z-10 bg-[#060810] border-b border-[#1c2333]">
              <tr>
                {['#', 'Username', 'Password', 'Status', 'Length', 'Time', 'Grep Match'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-2.5 py-1.5 text-[8.5px] uppercase tracking-wider text-[#2a3548] font-normal"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {displayed.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r === selected ? null : r)}
                  className={cn(
                    'border-b border-[#0d1017] cursor-pointer transition-colors',
                    r.hit ? 'bg-[#30d15808]' : '',
                    selected?.id === r.id ? 'bg-[#1c2333]' : 'hover:bg-[#111827]',
                  )}
                >
                  <td
                    className="px-2.5 py-1.5 font-bold"
                    style={{ color: r.hit ? '#30d158' : '#2a3548' }}
                  >
                    {r.id}
                  </td>
                  <td className="px-2.5 py-1.5" style={{ color: r.hit ? '#30d158' : '#6a7a9a' }}>
                    {r.username}
                  </td>
                  <td className="px-2.5 py-1.5" style={{ color: r.hit ? '#30d158' : '#4a5a7a' }}>
                    {r.password}
                  </td>
                  <td className="px-2.5 py-1.5 font-bold" style={{ color: statusColor(r.status) }}>
                    {r.status}
                  </td>
                  <td className="px-2.5 py-1.5 text-[#3a4558]">{r.length}</td>
                  <td className="px-2.5 py-1.5 text-[#3a4558]">{r.time}</td>
                  <td className="px-2.5 py-1.5 max-w-[180px]">
                    {r.grepMatches?.map((m, i) => (
                      <div key={i} className="text-[8.5px] truncate text-[#f5a623]">
                        {m}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail pane */}
        {selected && (
          <div className="w-64 shrink-0 border-l border-[#1c2333] bg-[#080b10] p-3 overflow-y-auto">
            <SectionHeader accent={selected.hit ? '#30d158' : '#3a4558'}>
              {selected.hit ? '✓ HIT DETAIL' : 'Request Detail'}
            </SectionHeader>
            <KV
              k="Request #"
              v={selected.id.toString()}
              vc={selected.hit ? 'text-[#30d158]' : 'text-[#6a7a9a]'}
            />
            <KV
              k="Username"
              v={selected.username}
              vc={selected.hit ? 'text-[#30d158]' : 'text-[#6a7a9a]'}
            />
            <KV
              k="Password"
              v={selected.password}
              vc={selected.hit ? 'text-[#30d158]' : 'text-[#6a7a9a]'}
            />
            <KV k="Status" v={selected.status.toString()} vc={`font-bold`} />
            <KV k="Length" v={`${selected.length} bytes`} />
            <KV k="Time" v={selected.time} />
            {selected.grepMatches && (
              <div className="mt-2 pt-2 border-t border-[#111827]">
                <div className="text-[8.5px] uppercase tracking-wider text-[#2a3548] font-mono mb-1">
                  Grep Matches
                </div>
                {selected.grepMatches.map((m, i) => (
                  <div
                    key={i}
                    className="text-[9px] font-mono text-[#f5a623] break-all bg-[#f5a62310] border border-[#f5a62320] rounded px-1.5 py-1 mb-1"
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
            {selected.hit && (
              <div className="mt-2 pt-2 border-t border-[#111827] space-y-1">
                <button
                  className="w-full text-[9px] font-bold font-mono py-1.5 rounded border"
                  style={{ color: '#0af', borderColor: '#0af30', background: '#0af10' }}
                >
                  Use in Repeater
                </button>
                <button
                  className="w-full text-[9px] font-bold font-mono py-1.5 rounded border"
                  style={{ color: '#30d158', borderColor: '#30d15830', background: '#30d15810' }}
                >
                  Copy Credential
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-[#060810] border-t border-[#1c2333] shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
          <span className="text-[9px] font-bold font-mono text-[#30d158]">RUNNING</span>
        </div>
        <span className="text-[9px] font-mono text-[#2a3548]">
          Cluster Bomb · 25 threads · 147 req/s
        </span>
        <span className="text-[9px] font-mono text-[#2a3548] ml-auto">
          1,240 / 423,500 · 0.29% · ETA 2h 14m
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: PAYLOADS
// ============================================================================
function TabPayloads() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {payloadSets.map((ps) => (
          <Card key={ps.position}>
            <SectionHeader accent="#0af">
              Position {ps.position} · {ps.name}
            </SectionHeader>
            <KV k="Type" v={ps.type} vc="text-[#0af]" />
            <KV k="Source" v={ps.source} />
            <KV k="Total entries" v={ps.total.toLocaleString()} vc="text-[#f5a623]" />
            <div className="mt-2 pt-2 border-t border-[#111827]">
              <div className="text-[8.5px] uppercase tracking-wider text-[#2a3548] font-mono mb-1.5">
                Preview ({ps.entries.length} shown)
              </div>
              <div className="flex flex-wrap gap-1">
                {ps.entries.map((e, i) => (
                  <span
                    key={i}
                    className="text-[8.5px] font-mono px-1.5 py-0.5 rounded border text-[#6a7a9a] border-[#1c2333] bg-[#111827]"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-1.5 mt-3 pt-2 border-t border-[#111827]">
              {[
                { label: 'Edit', color: '#0af' },
                { label: 'Add Entries', color: '#f5a623' },
                { label: 'Clear', color: '#ff2d55' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  className="text-[8.5px] font-bold font-mono px-2 py-1 rounded border transition-all"
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
          </Card>
        ))}

        {/* Payload Processing */}
        <Card className="col-span-2">
          <SectionHeader accent="#bf5af2">Payload Processing</SectionHeader>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'URL Encode', value: 'Enabled', ok: true },
              { label: 'Base64 Encode', value: 'Disabled', ok: false },
              { label: 'Add Prefix', value: 'None', ok: null },
              { label: 'Case Modify', value: 'None', ok: null },
              { label: 'Hash (MD5)', value: 'Disabled', ok: false },
              { label: 'Reverse', value: 'Disabled', ok: false },
              { label: 'Strip whitespace', value: 'Enabled', ok: true },
              { label: 'Custom rule', value: '0 rules', ok: null },
            ].map((item) => (
              <div key={item.label} className="p-2 bg-[#060810] border border-[#1c2333] rounded">
                <div className="text-[8px] uppercase tracking-wider text-[#2a3548] font-mono">
                  {item.label}
                </div>
                <div
                  className="text-[9.5px] font-mono mt-0.5"
                  style={{
                    color: item.ok === true ? '#30d158' : item.ok === false ? '#ff2d55' : '#4a5a7a',
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-2.5 text-[8.5px] font-bold font-mono px-3 py-1 rounded border"
            style={{ color: '#bf5af2', borderColor: '#bf5af230', background: '#bf5af210' }}
          >
            + Add Processing Rule
          </button>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: CONFIG
// ============================================================================
function TabConfig() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-3 gap-2">
        {/* Attack Settings */}
        <Card>
          <SectionHeader accent="#0af">Attack Settings</SectionHeader>
          <KV
            k="Attack Type"
            v={attackConfig.attackType.replace('_', ' ').toUpperCase()}
            vc="text-[#ff2d55] font-bold"
          />
          <KV k="Threads" v={attackConfig.threads.toString()} vc="text-[#f5a623]" />
          <KV k="Request Delay" v={`${attackConfig.delay}ms`} />
          <KV
            k="Follow Redirects"
            v={attackConfig.followRedirects ? 'Yes' : 'No'}
            vc={attackConfig.followRedirects ? 'text-[#30d158]' : 'text-[#ff2d55]'}
          />
          <KV
            k="Encode Payload"
            v={attackConfig.encodePayload ? 'Yes' : 'No'}
            vc={attackConfig.encodePayload ? 'text-[#30d158]' : 'text-[#ff2d55]'}
          />
          <KV
            k="URL Encode"
            v={attackConfig.encodeUrl ? 'Yes' : 'No'}
            vc={attackConfig.encodeUrl ? 'text-[#30d158]' : 'text-[#ff2d55]'}
          />
        </Card>

        {/* Match Rules */}
        <Card>
          <SectionHeader accent="#30d158">Match Rules</SectionHeader>
          <div className="space-y-1.5">
            <div>
              <div className="text-[8.5px] font-mono text-[#2a3548] mb-1">Match Status Codes</div>
              <div className="flex flex-wrap gap-1">
                {attackConfig.matchStatusCodes.map((c) => (
                  <span
                    key={c}
                    className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border text-[#30d158] border-[#30d15830] bg-[#30d15810]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[8.5px] font-mono text-[#2a3548] mb-1">Exclude Status Codes</div>
              <div className="flex flex-wrap gap-1">
                {attackConfig.excludeStatusCodes.map((c) => (
                  <span
                    key={c}
                    className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border text-[#ff2d55] border-[#ff2d5530] bg-[#ff2d5510]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[8.5px] font-mono text-[#2a3548] mb-1">Exclude Lengths</div>
              <div className="flex flex-wrap gap-1">
                {attackConfig.excludeLengths.map((l) => (
                  <span
                    key={l}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-[#ff6b35] border-[#ff6b3530] bg-[#ff6b3510]"
                  >
                    {l} bytes
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[8.5px] font-mono text-[#2a3548] mb-1">Match Regex</div>
              {attackConfig.matchRegexes.map((r) => (
                <div
                  key={r}
                  className="text-[9px] font-mono text-[#f5a623] bg-[#f5a62310] border border-[#f5a62320] rounded px-1.5 py-0.5 mb-0.5"
                >
                  {r}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Grep Extract */}
        <Card>
          <SectionHeader accent="#f5a623">Grep Extract Rules</SectionHeader>
          <div className="space-y-2">
            {attackConfig.grepMatchRegexes.map((g, i) => (
              <div key={i} className="bg-[#060810] border border-[#1c2333] rounded p-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[8px] font-mono text-[#2a3548] uppercase">
                    Rule {i + 1}
                  </span>
                  <span className="text-[8px] font-mono text-[#2a3548]">
                    Group {g.captureGroup}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-[#f5a623] break-all">{g.regex}</div>
              </div>
            ))}
          </div>
          <button
            className="mt-2 text-[8.5px] font-bold font-mono px-3 py-1 rounded border"
            style={{ color: '#f5a623', borderColor: '#f5a62330', background: '#f5a62310' }}
          >
            + Add Grep Rule
          </button>
        </Card>

        {/* Attack modes explainer */}
        <Card className="col-span-3">
          <SectionHeader accent="#bf5af2">Attack Mode Reference</SectionHeader>
          <div className="grid grid-cols-4 gap-2">
            {ATTACK_MODES.map((m) => (
              <div
                key={m.id}
                className="rounded p-2.5"
                style={{ background: `${m.color}08`, border: `1px solid ${m.color}25` }}
              >
                <div className="font-mono text-[10px] font-bold mb-0.5" style={{ color: m.color }}>
                  {m.label}
                </div>
                <div className="text-[8.5px] text-[#3a4558]">{m.desc}</div>
                {m.id === 'cluster_bomb' && (
                  <div className="mt-1 text-[8px] font-bold text-[#ff2d55] font-mono">← ACTIVE</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: GREP EXTRACT
// ============================================================================
function TabGrepExtract() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <Card>
        <SectionHeader accent="#f5a623">
          Extracted Values ({grepExtracts.length} results)
        </SectionHeader>
        <table className="w-full font-mono text-[10px]">
          <thead>
            <tr className="border-b border-[#1c2333]">
              {['Credential', 'Extracted Value', 'Request #'].map((h) => (
                <th
                  key={h}
                  className="text-left px-2 py-1.5 text-[8.5px] uppercase tracking-wider text-[#2a3548] font-normal"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grepExtracts.map((ex, i) => (
              <tr
                key={i}
                className="border-b border-[#0d1017] hover:bg-[#111827] transition-colors group"
              >
                <td className="px-2 py-2 text-[#30d158] font-bold">{ex.payload}</td>
                <td className="px-2 py-2 max-w-xs">
                  <div className="text-[8.5px] text-[#f5a623] bg-[#f5a62308] border border-[#f5a62220] rounded px-1.5 py-1 break-all leading-relaxed">
                    {ex.extracted}
                  </div>
                </td>
                <td className="px-2 py-2 text-[#2a3548]">#{ex.occurrence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {grepExtracts.map((ex, i) => {
          // Try to decode JWT
          let decoded = null;
          try {
            const parts = ex.extracted.split('.');
            if (parts.length >= 2) {
              decoded = JSON.parse(atob(parts[1]));
            }
          } catch (_) {}
          return (
            <Card key={i} accent="#f5a623">
              <SectionHeader accent="#f5a623">JWT Decode · req #{ex.occurrence}</SectionHeader>
              <div className="text-[8.5px] font-mono text-[#2a3548] mb-1">
                Credential: <span className="text-[#30d158]">{ex.payload}</span>
              </div>
              {decoded ? (
                <div className="bg-[#060810] border border-[#f5a62220] rounded p-2 font-mono text-[9px]">
                  {Object.entries(decoded).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-[#2a3548]">"{k}":</span>
                      <span className="text-[#f5a623]">"{String(v)}"</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[9px] text-[#2a3548] font-mono">Raw token (decode failed)</div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: INTRUDER LOG
// ============================================================================
function TabLog() {
  const [lines, setLines] = useState(LOG_LINES.slice(0, 8));
  const [idx, setIdx] = useState(8);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (idx >= LOG_LINES.length) return;
    const t = setTimeout(
      () => {
        setLines((prev) => [...prev, LOG_LINES[idx]]);
        setIdx((i) => i + 1);
      },
      600 + Math.random() * 400,
    );
    return () => clearTimeout(t);
  }, [idx]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto p-3 bg-[#040608] font-mono text-[10px] leading-relaxed"
    >
      <div className="text-[#1c2333] mb-2">
        ghost-intruder v2.0 · target: /api/v1/login · cluster_bomb mode
      </div>
      {lines.map((log, i) => (
        <div key={i} className="mb-0.5 flex gap-2">
          <span className="text-[#1c2333] shrink-0">[{log.ts}]</span>
          <span style={{ color: logColor(log.level) }}>{log.msg}</span>
        </div>
      ))}
      {idx < LOG_LINES.length && <span className="text-[#30d158] animate-pulse">█</span>}
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================
const TABS = [
  { id: 'results', label: 'Attack Results', accent: '#30d158' },
  { id: 'payloads', label: 'Payloads', accent: '#0af' },
  { id: 'config', label: 'Config', accent: '#bf5af2' },
  { id: 'grep', label: 'Grep Extract', accent: '#f5a623' },
  { id: 'log', label: 'Intruder Log', accent: '#30d158' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function Intruder() {
  const [activeTab, setActiveTab] = useState<TabId>('results');
  const [attackMode, setAttackMode] = useState('cluster_bomb');
  const activeAccent = TABS.find((t) => t.id === activeTab)?.accent ?? '#0af';

  const renderContent = () => {
    switch (activeTab) {
      case 'results':
        return <TabResults />;
      case 'payloads':
        return <TabPayloads />;
      case 'config':
        return <TabConfig />;
      case 'grep':
        return <TabGrepExtract />;
      case 'log':
        return <TabLog />;
      default:
        return null;
    }
  };

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden bg-[#080b10]"
      style={{ fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace' }}
    >
      {/* Tab bar */}
      <div className="flex items-center gap-0 px-3 h-[30px] bg-[#060810] border-b border-[#1c2333] shrink-0">
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
                style={{ background: activeAccent }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Attack mode + control bar */}
      <AttackModeBar active={attackMode} onSelect={setAttackMode} />

      {/* Content */}
      {renderContent()}
    </div>
  );
}
