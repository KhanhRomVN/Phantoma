// src/renderer/src/features/Tool/components/WorkspaceSection/Intruder/index.tsx
import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import {
  Badge,
  KVRow,
  ModuleTabBar,
  ProgressBar,
  ToolbarButton,
  ActionButton,
} from '../../../../../core/components/ui';

// ============================================================================
// 1. MOCK DATA (CHI TIẾT CHO FUZZING / INTRUDER)
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
  customResponse?: string;
}

const attackResults: AttackResult[] = [
  {
    id: 241,
    username: 'admin',
    password: 'admin123',
    status: 200,
    length: 1432,
    time: '142ms',
    hit: true,
    grepMatches: ['Welcome admin', 'token: eyJhbGciOiJ'],
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
];

// Payload Sets
interface PayloadSet {
  position: number;
  name: string;
  type: 'simple' | 'multiple' | 'recursive';
  entries: string[];
  total: number;
  source: string;
}

const payloadSets: PayloadSet[] = [
  {
    position: 1,
    name: 'usernames',
    type: 'simple',
    entries: ['admin', 'administrator', 'root', 'user', 'test', 'demo', 'guest', 'support'],
    total: 847,
    source: 'usernames.txt (first 8 shown)',
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
    ],
    total: 500,
    source: 'top-500-passwords.txt (first 8 shown)',
  },
];

// Attack Configuration
interface AttackConfig {
  attackType: 'sniper' | 'battering_ram' | 'pitchfork' | 'cluster_bomb';
  threads: number;
  delay: number;
  followRedirects: boolean;
  encodePayload: boolean;
  encodeUrl: boolean;
  matchRegexes: string[];
  matchStatusCodes: number[];
  matchLengths: number[];
  excludeStatusCodes: number[];
  excludeLengths: number[];
  grepMatchRegexes: { regex: string; captureGroup: number }[];
}

const attackConfig: AttackConfig = {
  attackType: 'cluster_bomb',
  threads: 25,
  delay: 0,
  followRedirects: true,
  encodePayload: true,
  encodeUrl: true,
  matchRegexes: ['Welcome', 'token:'],
  matchStatusCodes: [200, 302],
  matchLengths: [],
  excludeStatusCodes: [404, 403],
  excludeLengths: [89, 61],
  grepMatchRegexes: [
    { regex: '"token":"([a-zA-Z0-9_\\-\\.]+)"', captureGroup: 1 },
    { regex: 'Welcome ([a-zA-Z0-9_]+)', captureGroup: 1 },
  ],
};

// Grep Extract Results (extracted from responses)
interface GrepExtract {
  payload: string;
  extracted: string;
  occurrence: number;
}

const grepExtracts: GrepExtract[] = [
  {
    payload: 'admin:admin123',
    extracted:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIn0',
    occurrence: 241,
  },
  {
    payload: 'administrator:P@ssw0rd!',
    extracted:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluaXN0cmF0b3IiLCJyb2xlIjoiYWRtaW4ifQ',
    occurrence: 388,
  },
];

// Intruder Log (console-like output)
const intruderLogs = [
  { ts: '10:00:01', level: 'info', msg: 'Intruder attack started (Cluster Bomb mode).' },
  { ts: '10:00:01', level: 'info', msg: 'Payload set 1 (usernames): 847 entries.' },
  { ts: '10:00:01', level: 'info', msg: 'Payload set 2 (passwords): 500 entries.' },
  { ts: '10:00:01', level: 'info', msg: 'Total combinations: 423,500.' },
  { ts: '10:00:02', level: 'success', msg: 'Request #1: admin:123456 → 401 (89 bytes)' },
  { ts: '10:00:02', level: 'success', msg: 'Request #2: admin:password → 401 (89 bytes)' },
  {
    ts: '10:00:03',
    level: 'success',
    msg: 'Request #3: admin:admin123 → 200 (1432 bytes) ✅ HIT!',
  },
  {
    ts: '10:00:03',
    level: 'grep',
    msg: 'Extracted token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  {
    ts: '10:00:04',
    level: 'success',
    msg: 'Request #388: administrator:P@ssw0rd! → 200 (1432 bytes) ✅ HIT!',
  },
  { ts: '10:00:05', level: 'progress', msg: 'Progress: 1240 / 423,500 (0.29%) — ETA 2h 14m' },
];

// ============================================================================
// 2. UI COMPONENTS (common)
// ============================================================================

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
    {children}
  </div>
);
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />;
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-2">
    {children}
  </div>
);

// Helper: status color for HTTP codes
const statusColor = (code: number) => {
  if (code === 200) return 'text-green-400';
  if (code === 301 || code === 302) return 'text-amber-400';
  if (code >= 400 && code < 500) return 'text-red-400';
  if (code >= 500) return 'text-purple-400';
  return 'text-[#6b7a96]';
};

// ============================================================================
// 3. TAB COMPONENTS
// ============================================================================

// ---- Attack Results Tab (table with hits highlighted) ----
function AttackResultsTab() {
  const [filterHitsOnly, setFilterHitsOnly] = useState(false);
  const displayed = filterHitsOnly ? attackResults.filter((r) => r.hit) : attackResults;
  const totalHits = attackResults.filter((r) => r.hit).length;
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 bg-[#0f1319] border-b border-[#1e2535] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#6b7a96]">Filter:</span>
          <button
            onClick={() => setFilterHitsOnly(!filterHitsOnly)}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-semibold',
              filterHitsOnly
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-[#6b7a96] hover:text-[#c5cfe0]',
            )}
          >
            Show hits only ({totalHits})
          </button>
        </div>
        <div className="text-[10px] text-[#6b7a96]">
          Showing {displayed.length} of {attackResults.length} requests
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[10.5px] border-collapse">
          <thead>
            <tr className="border-b border-[#1e2535] bg-[#0f1319] sticky top-0">
              <th className="text-left text-[9.5px] font-bold text-[#3d4a61] uppercase px-2 py-1.5">
                #
              </th>
              <th className="text-left text-[9.5px] font-bold text-[#3d4a61] uppercase px-2 py-1.5">
                Username
              </th>
              <th className="text-left text-[9.5px] font-bold text-[#3d4a61] uppercase px-2 py-1.5">
                Password
              </th>
              <th className="text-left text-[9.5px] font-bold text-[#3d4a61] uppercase px-2 py-1.5">
                Status
              </th>
              <th className="text-left text-[9.5px] font-bold text-[#3d4a61] uppercase px-2 py-1.5">
                Length
              </th>
              <th className="text-left text-[9.5px] font-bold text-[#3d4a61] uppercase px-2 py-1.5">
                Time
              </th>
              <th className="text-left text-[9.5px] font-bold text-[#3d4a61] uppercase px-2 py-1.5">
                Grep
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((r) => (
              <tr
                key={r.id}
                className={cn(
                  'border-b border-[#1e2535]/50 hover:bg-white/[0.02]',
                  r.hit && 'bg-cyan-500/5',
                )}
              >
                <td
                  className={cn('px-2 py-1 font-mono', r.hit ? 'text-cyan-400' : 'text-[#c5cfe0]')}
                >
                  {r.id}
                </td>
                <td className={cn('px-2 py-1', r.hit ? 'text-green-400' : 'text-[#c5cfe0]')}>
                  {r.username}
                </td>
                <td className={cn('px-2 py-1', r.hit ? 'text-green-400' : 'text-[#c5cfe0]')}>
                  {r.password}
                </td>
                <td className={cn('px-2 py-1 font-bold', statusColor(r.status))}>{r.status}</td>
                <td className="px-2 py-1 text-[#6b7a96]">{r.length}</td>
                <td className="px-2 py-1 text-[#6b7a96]">{r.time}</td>
                <td className="px-2 py-1">
                  {r.grepMatches?.map((m, i) => (
                    <div
                      key={i}
                      className="text-[9px] text-amber-400 truncate max-w-[150px]"
                      title={m}
                    >
                      {m.slice(0, 20)}…
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-[#1e2535] shrink-0">
        <div className="flex justify-between text-[10px] text-[#6b7a96] mb-1">
          <span className="text-green-400">▶ Attack running — Cluster Bomb mode</span>
          <span>1,240 sent · 0.29% complete · ETA 2h 14m</span>
        </div>
        <ProgressBar pct={0.29} color="green" />
      </div>
    </div>
  );
}

// ---- Payloads Tab (Payload Sets and Management) ----
function PayloadsTab() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        {payloadSets.map((ps) => (
          <div key={ps.position} className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <SectionTitle>
              Position {ps.position}: {ps.name} ({ps.type})
            </SectionTitle>
            <KVRow label="Source" value={ps.source} valueColor="text-cyan-400" />
            <KVRow label="Total entries" value={ps.total.toString()} />
            <div className="mt-2">
              <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase mb-1">
                Preview (first 8)
              </div>
              <div className="flex flex-wrap gap-1">
                {ps.entries.map((e) => (
                  <Badge key={e} color="gray">
                    {e}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <ActionButton size="sm">Edit</ActionButton>
              <ActionButton size="sm">Add entries</ActionButton>
              <ActionButton size="sm" variant="red">
                Clear
              </ActionButton>
            </div>
          </div>
        ))}
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3 col-span-2">
          <SectionTitle>Payload Processing</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <KVRow
              label="URL-encode"
              value={attackConfig.encodeUrl ? 'Yes' : 'No'}
              valueColor={attackConfig.encodeUrl ? 'text-green-400' : 'text-red-400'}
            />
            <KVRow label="Base64-encode" value="No" />
            <KVRow label="Add prefix/suffix" value="None" />
            <KVRow label="Case modification" value="None" />
          </div>
          <ActionButton size="sm" variant="cyan" className="mt-2">
            Add Processing Rule
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

// ---- Config Tab (Attack Configuration, Matching, Grep) ----
function ConfigTab() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Attack Settings</SectionTitle>
          <KVRow
            label="Attack type"
            value={attackConfig.attackType.toUpperCase()}
            valueColor="text-cyan-400"
          />
          <KVRow label="Threads" value={attackConfig.threads.toString()} />
          <KVRow label="Delay (ms)" value={attackConfig.delay.toString()} />
          <KVRow
            label="Follow redirects"
            value={attackConfig.followRedirects ? 'Yes' : 'No'}
            valueColor={attackConfig.followRedirects ? 'text-green-400' : 'text-red-400'}
          />
          <KVRow label="Encode payload" value={attackConfig.encodePayload ? 'Yes' : 'No'} />
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Matching Rules</SectionTitle>
          <KVRow
            label="Match status codes"
            value={attackConfig.matchStatusCodes.join(', ')}
            valueColor="text-green-400"
          />
          <KVRow
            label="Match response lengths"
            value={
              attackConfig.matchLengths.length ? attackConfig.matchLengths.join(', ') : 'Not set'
            }
          />
          <KVRow label="Match regex" value={attackConfig.matchRegexes.join(', ')} />
          <KVRow label="Exclude status" value={attackConfig.excludeStatusCodes.join(', ')} />
          <KVRow label="Exclude lengths" value={attackConfig.excludeLengths.join(', ')} />
        </div>
        <div className="col-span-2 bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Grep – Extract (regex capture groups)</SectionTitle>
          {attackConfig.grepMatchRegexes.map((g, i) => (
            <div key={i} className="mb-2">
              <KVRow label={`Regex ${i + 1}`} value={g.regex} valueColor="text-amber-400" />
              <div className="text-[9px] text-[#6b7a96] ml-20">Capture group: {g.captureGroup}</div>
            </div>
          ))}
          <ActionButton size="sm" variant="cyan" className="mt-2">
            Add Grep Extract
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

// ---- Grep Extract Tab (extracted values) ----
function GrepExtractTab() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="bg-[#111520] border border-[#1e2535] rounded">
        <table className="w-full text-[10px]">
          <thead className="border-b border-[#1e2535] bg-[#0f1319]">
            <tr>
              <th className="text-left p-2">Payload</th>
              <th className="text-left p-2">Extracted value</th>
              <th className="text-left p-2">Request #</th>
            </tr>
          </thead>
          <tbody>
            {grepExtracts.map((ex, i) => (
              <tr key={i} className="border-b border-[#1e2535] hover:bg-[#0f1319]">
                <td className="p-2 font-mono text-cyan-400">{ex.payload}</td>
                <td className="p-2 font-mono text-green-400 break-all">{ex.extracted}</td>
                <td className="p-2 text-[#6b7a96]">{ex.occurrence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Intruder Log Tab (console output) ----
function IntruderLogTab() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#0f1319] font-mono">
      {intruderLogs.map((log, i) => {
        const color =
          log.level === 'success'
            ? 'text-green-400'
            : log.level === 'grep'
              ? 'text-amber-400'
              : log.level === 'progress'
                ? 'text-cyan-400'
                : 'text-[#c5cfe0]';
        return (
          <div
            key={i}
            className="text-[10px] leading-6 whitespace-pre-wrap border-b border-[#1e2535]/30 py-0.5"
          >
            <span className="text-[#3d4a61]">[{log.ts}]</span>{' '}
            <span className={color}>{log.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// 4. MAIN EXPORT
// ============================================================================

const TABS = ['Attack Results', 'Payloads', 'Config', 'Grep Extract', 'Intruder Log'] as const;

export function Intruder() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Attack Results':
        return <AttackResultsTab />;
      case 'Payloads':
        return <PayloadsTab />;
      case 'Config':
        return <ConfigTab />;
      case 'Grep Extract':
        return <GrepExtractTab />;
      case 'Intruder Log':
        return <IntruderLogTab />;
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
        activeColor="text-amber-400 border-amber-400 bg-amber-500/5"
      />
      <Toolbar>
        <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] whitespace-nowrap">
          Mode:
        </span>
        <ToolbarButton variant="cyan">Sniper</ToolbarButton>
        <ToolbarButton>Battering Ram</ToolbarButton>
        <ToolbarButton>Pitchfork</ToolbarButton>
        <ToolbarButton>Cluster Bomb</ToolbarButton>
        <TbSep />
        <ToolbarButton variant="green">▶ Start Attack</ToolbarButton>
        <ToolbarButton variant="red" className="ml-auto">
          ■ Stop
        </ToolbarButton>
      </Toolbar>
      {renderTabContent()}
    </div>
  );
}
