// src/renderer/src/features/Tool/components/WorkspaceSection/Cracking/index.tsx
import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import {
  Badge,
  KVRow,
  ModuleTabBar,
  ToolbarButton,
  ProgressBar,
  LogLine,
  ActionButton,
  PulseIndicator,
} from '../../../../../core/components/ui';

// ============================================================================
// 1. MOCK DATA CHI TIẾT
// ============================================================================

interface HashItem {
  id: string;
  hash: string;
  type: string;
  mode: number;
  status: 'pending' | 'cracking' | 'cracked' | 'failed';
  result?: string;
  speed?: string;
  eta?: string;
}

const hashQueue: HashItem[] = [
  {
    id: 'h1',
    hash: '$2y$10$abc123def456ghi789jklmno',
    type: 'bcrypt $2y$ (cost 10)',
    mode: 3200,
    status: 'cracking',
    speed: '124 H/s',
    eta: '2h 14m',
  },
  {
    id: 'h2',
    hash: 'aad3b435b51404eeaad3b435b51404ee',
    type: 'NTLM (empty hash!)',
    mode: 1000,
    status: 'cracked',
    result: '"" (empty password)',
  },
  {
    id: 'h3',
    hash: 'd7b5e5f4e2a1c3b9a7d6e8f1c0b2a4d3',
    type: 'NTLM',
    mode: 1000,
    status: 'cracked',
    result: 'P@ssw0rd!',
  },
  {
    id: 'h4',
    hash: '5f4dbc1dbc93a2d8d4b7c8e9f1a2b3c4',
    type: 'NTLM',
    mode: 1000,
    status: 'cracked',
    result: 'admin123',
  },
  {
    id: 'h5',
    hash: 'b109f3bbbc244eb82441917ed06d618b9008dd09',
    type: 'SHA1',
    mode: 100,
    status: 'cracking',
    speed: '1.2 GH/s',
    eta: '5m 22s',
  },
  { id: 'h6', hash: 'e99a18c428cb38d5f260853678922e03', type: 'MD5', mode: 0, status: 'pending' },
  {
    id: 'h7',
    hash: '$6$rounds=5000$abcxyz$789...',
    type: 'SHA512crypt',
    mode: 1800,
    status: 'pending',
  },
];

// Available attack modes
const attackModes = [
  { id: 'wordlist', name: 'Wordlist', description: 'Dictionary attack', icon: '📖' },
  { id: 'rules', name: 'Rules', description: 'Apply mangling rules', icon: '⚙️' },
  { id: 'bruteforce', name: 'Bruteforce', description: 'Mask attack', icon: '🔢' },
  { id: 'combinator', name: 'Combinator', description: 'Combine two wordlists', icon: '🔗' },
  { id: 'hybrid', name: 'Hybrid', description: 'Wordlist + mask', icon: '🧬' },
];

// Wordlists
const wordlists = [
  {
    name: 'rockyou.txt',
    size: '14.3 MB',
    lines: 14344392,
    status: 'loaded',
    path: '/usr/share/wordlists/rockyou.txt',
  },
  {
    name: 'SecLists/Passwords/Common-Credentials/10k-most-common.txt',
    size: '128 KB',
    lines: 10000,
    status: 'loaded',
    path: '/opt/seclists/...',
  },
  {
    name: 'crackstation-human-only.txt',
    size: '124 MB',
    lines: 64000000,
    status: 'loaded',
    path: '/opt/wordlists/crackstation.txt',
  },
  {
    name: 'custom_company.txt',
    size: '2.1 MB',
    lines: 234512,
    status: 'custom',
    path: './custom_lists/company.txt',
  },
];

// Rules
const rules = [
  { name: 'best64.rule', description: 'Most effective 64 rules', enabled: true, source: 'hashcat' },
  { name: 'd3ad0ne.rule', description: 'Aggressive mangling', enabled: false, source: 'hashcat' },
  { name: 'leetspeak.rule', description: '1337 substitutions', enabled: true, source: 'custom' },
  { name: 'passwordspro.rule', description: 'Common mutations', enabled: false, source: 'hashcat' },
];

// GPU Devices
const gpuDevices = [
  {
    id: 1,
    name: 'NVIDIA RTX 3090',
    memory: '24268 MB',
    utilization: 87,
    temperature: 72,
    clocks: '1860 MHz',
    status: 'active',
    hashrate: '14823.3 MH/s',
  },
  {
    id: 2,
    name: 'NVIDIA RTX 3080',
    memory: '10240 MB',
    utilization: 94,
    temperature: 78,
    clocks: '1750 MHz',
    status: 'active',
    hashrate: '8924.7 MH/s',
  },
];

// Hashcat output logs (detailed)
const hashcatLogs = [
  {
    ts: '10:00:01',
    tag: 'HC',
    tagColor: 'cyan',
    msg: 'hashcat (v6.2.6) starting in benchmark mode...',
  },
  {
    ts: '10:00:02',
    tag: 'GPU',
    tagColor: 'cyan',
    msg: 'Device #1: NVIDIA RTX 3090, 24268/24268 MB allocatable',
  },
  {
    ts: '10:00:02',
    tag: 'GPU',
    tagColor: 'cyan',
    msg: 'Device #2: NVIDIA RTX 3080, 10240/10240 MB allocatable',
  },
  {
    ts: '10:00:03',
    tag: 'INFO',
    tagColor: 'cyan',
    msg: 'Hash-mode 1000 (NTLM) — Attack Mode: Straight (Wordlist + Rules)',
  },
  {
    ts: '10:00:03',
    tag: 'INFO',
    tagColor: 'cyan',
    msg: 'Wordlist: rockyou.txt (14344392 lines) — Rules: best64.rule',
  },
  {
    ts: '10:00:05',
    tag: 'CRACK',
    tagColor: 'green',
    msg: 'aad3b435b51404eeaad3b435b51404ee:"" (empty password)',
  },
  {
    ts: '10:00:12',
    tag: 'CRACK',
    tagColor: 'green',
    msg: 'd7b5e5f4e2a1c3b9a7d6e8f1c0b2a4d3:P@ssw0rd!',
  },
  {
    ts: '10:00:18',
    tag: 'CRACK',
    tagColor: 'green',
    msg: '5f4dbc1dbc93a2d8d4b7c8e9f1a2b3c4:admin123',
  },
  {
    ts: '10:00:20',
    tag: 'SPEED',
    tagColor: 'gray',
    msg: 'Speed: 14823.3 MH/s (Device #1), 8924.7 MH/s (Device #2) — ETA 00:04:12 for remaining',
  },
  {
    ts: '10:00:25',
    tag: 'PROG',
    tagColor: 'cyan',
    msg: 'Recovered........: 3/7 (42.86%) Digests, 3/7 (42.86%) Salts',
  },
  {
    ts: '10:00:30',
    tag: 'INFO',
    tagColor: 'cyan',
    msg: 'Cracking bcrypt hash (mode 3200) — slow hash, ETA 2h 14m',
  },
  {
    ts: '10:01:00',
    tag: 'WARN',
    tagColor: 'amber',
    msg: 'Device #2 temperature high (78°C), throttling may occur',
  },
];

// Results table
const crackedResults = [
  {
    hash: 'aad3b435b51404ee...',
    type: 'NTLM',
    plaintext: '"" (empty)',
    time: '0.02s',
    source: 'wordlist',
  },
  {
    hash: 'd7b5e5f4e2a1c3b9...',
    type: 'NTLM',
    plaintext: 'P@ssw0rd!',
    time: '0.15s',
    source: 'wordlist + rules',
  },
  {
    hash: '5f4dbc1dbc93a2d8...',
    type: 'NTLM',
    plaintext: 'admin123',
    time: '0.09s',
    source: 'wordlist',
  },
];

// Online lookup services mock
const onlineServices = [
  { name: 'CrackStation', url: 'https://crackstation.net', apiKey: false, rate: 'Free' },
  { name: 'MD5Decrypt', url: 'https://md5decrypt.net', apiKey: false, rate: 'Free' },
  { name: 'Google (cache)', url: 'https://google.com', apiKey: false, rate: 'Manual' },
  { name: 'HashToolkit', url: 'https://hashtoolkit.com', apiKey: false, rate: 'Free' },
];

// ============================================================================
// 2. UI COMPONENTS
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

function HashQueueItem({ item }: { item: HashItem }) {
  const statusColor = {
    pending: 'text-[#6b7a96]',
    cracking: 'text-amber-400',
    cracked: 'text-green-400',
    failed: 'text-red-400',
  };
  const statusBg = {
    pending: 'border-[#1e2535]',
    cracking: 'border-amber-500/20 bg-amber-500/5',
    cracked: 'border-green-500/20 bg-green-500/5',
    failed: 'border-red-500/20 bg-red-500/5',
  };
  return (
    <div className={cn('border rounded p-2.5 mb-2', statusBg[item.status])}>
      <div className="flex justify-between items-start mb-1">
        <span className="font-mono text-[10px] text-cyan-400 break-all flex-1">
          {item.hash.slice(0, 32)}…
        </span>
        <Badge
          color={
            item.status === 'cracked' ? 'green' : item.status === 'cracking' ? 'amber' : 'gray'
          }
        >
          {item.status}
        </Badge>
      </div>
      <KVRow label="Type" value={item.type} valueColor="text-cyan-400" />
      <KVRow label="Mode" value={item.mode.toString()} />
      {item.result && <KVRow label="Result" value={item.result} valueColor="text-green-400" />}
      {item.speed && <KVRow label="Speed" value={item.speed} />}
      {item.eta && <KVRow label="ETA" value={item.eta} />}
    </div>
  );
}

// ============================================================================
// 3. TAB COMPONENTS
// ============================================================================

// ---- Hash Input Tab ----
function TabHashInput() {
  const [manualHash, setManualHash] = useState('');
  const [hashType, setHashType] = useState('auto');
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Manual Entry</SectionTitle>
          <textarea
            value={manualHash}
            onChange={(e) => setManualHash(e.target.value)}
            placeholder="Paste hashes (one per line)&#10;e.g.:&#10;5f4dcc3b5aa765d61d8327deb882cf99&#10;$2y$10$...&#10;..."
            className="w-full h-32 bg-[#0f1319] border border-[#252e42] rounded text-[10px] font-mono text-[#c5cfe0] p-2 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <select className="h-7 bg-[#0f1319] border border-[#252e42] rounded text-[10px] px-2 text-[#c5cfe0]">
              <option value="auto">Auto-detect</option>
              <option value="md5">MD5</option>
              <option value="sha1">SHA1</option>
              <option value="sha256">SHA256</option>
              <option value="ntlm">NTLM</option>
              <option value="bcrypt">bcrypt</option>
            </select>
            <ToolbarButton variant="cyan">Add to Queue</ToolbarButton>
          </div>
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Import from File</SectionTitle>
          <div className="border-2 border-dashed border-[#252e42] rounded p-4 text-center mb-2">
            <div className="text-2xl mb-1">📁</div>
            <div className="text-[10px] text-[#6b7a96]">
              Drag & drop hash file or click to browse
            </div>
            <ToolbarButton size="sm" className="mt-2">
              Select File
            </ToolbarButton>
          </div>
          <div className="text-[9px] text-[#3d4a61]">
            Supported formats: .txt, .hash, .potfile (hashcat output)
          </div>
        </div>
        <div className="col-span-2 bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Hash Queue Summary</SectionTitle>
          <div className="grid grid-cols-4 gap-2 text-center mb-2">
            <div className="bg-[#0f1319] rounded p-1">
              <div className="text-[16px] font-bold text-amber-400">
                {hashQueue.filter((h) => h.status === 'cracking').length}
              </div>
              <div className="text-[9px] text-[#6b7a96]">Cracking</div>
            </div>
            <div className="bg-[#0f1319] rounded p-1">
              <div className="text-[16px] font-bold text-green-400">
                {hashQueue.filter((h) => h.status === 'cracked').length}
              </div>
              <div className="text-[9px] text-[#6b7a96]">Cracked</div>
            </div>
            <div className="bg-[#0f1319] rounded p-1">
              <div className="text-[16px] font-bold text-[#6b7a96]">
                {hashQueue.filter((h) => h.status === 'pending').length}
              </div>
              <div className="text-[9px] text-[#6b7a96]">Pending</div>
            </div>
            <div className="bg-[#0f1319] rounded p-1">
              <div className="text-[16px] font-bold text-red-400">
                {hashQueue.filter((h) => h.status === 'failed').length}
              </div>
              <div className="text-[9px] text-[#6b7a96]">Failed</div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <ToolbarButton variant="red">Clear Queue</ToolbarButton>
            <ToolbarButton variant="green">Start Attack</ToolbarButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Attack Config Tab ----
function TabAttackConfig() {
  const [selectedMode, setSelectedMode] = useState('wordlist');
  const [selectedWordlist, setSelectedWordlist] = useState('rockyou.txt');
  const [selectedRules, setSelectedRules] = useState(['best64.rule']);
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Attack Mode</SectionTitle>
          {attackModes.map((mode) => (
            <div
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={cn(
                'p-2 mb-1 rounded cursor-pointer border transition-all',
                selectedMode === mode.id
                  ? 'border-cyan-500/40 bg-cyan-500/10'
                  : 'border-transparent hover:bg-[#0f1319]',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{mode.icon}</span>
                <div>
                  <div className="text-[11px] font-semibold text-[#c5cfe0]">{mode.name}</div>
                  <div className="text-[9px] text-[#6b7a96]">{mode.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Wordlist</SectionTitle>
          <select
            className="w-full h-7 bg-[#0f1319] border border-[#252e42] rounded text-[10px] px-2 text-[#c5cfe0] mb-2"
            value={selectedWordlist}
            onChange={(e) => setSelectedWordlist(e.target.value)}
          >
            {wordlists.map((w) => (
              <option key={w.name}>
                {w.name} ({w.size})
              </option>
            ))}
          </select>
          <div className="text-[9px] text-[#6b7a96]">
            {wordlists.find((w) => w.name === selectedWordlist)?.lines.toLocaleString()} lines
          </div>
          <div className="mt-2">
            <SectionTitle>Rules</SectionTitle>
            {rules.map((rule) => (
              <label key={rule.name} className="flex items-center gap-2 text-[10px] py-0.5">
                <input type="checkbox" checked={rule.enabled} readOnly className="w-3 h-3" />
                <span className="text-[#c5cfe0]">{rule.name}</span>
                <span className="text-[#6b7a96]">({rule.description})</span>
              </label>
            ))}
          </div>
        </div>
        <div className="col-span-2 bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Advanced Settings</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            <KVRow label="Threads" value="8 (auto)" />
            <KVRow label="Workload profile" value="3 (high)" />
            <KVRow label="Show progress" value="1s interval" />
            <KVRow label="Outfile format" value="hash:plain" />
            <KVRow label="Remove found" value="Yes" />
            <KVRow label="Potfile path" value="./hashcat.potfile" />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <ToolbarButton>Save as Profile</ToolbarButton>
            <ToolbarButton variant="green">Apply & Run</ToolbarButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Hashcat Output Tab ----
function TabHashcatOutput() {
  return (
    <div className="flex flex-1 overflow-hidden bg-[#080a0e]">
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 bg-[#0f1319] font-mono">
        {hashcatLogs.map((l, i) => (
          <LogLine key={i} ts={l.ts} tag={l.tag} tagColor={l.tagColor} msg={l.msg} />
        ))}
      </div>
    </div>
  );
}

// ---- Results Tab ----
function TabResults() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="bg-[#111520] border border-[#1e2535] rounded">
        <table className="w-full text-[10px]">
          <thead className="border-b border-[#1e2535] bg-[#0f1319]">
            <tr>
              <th className="text-left p-2 text-[#3d4a61]">Hash (truncated)</th>
              <th className="text-left p-2 text-[#3d4a61]">Type</th>
              <th className="text-left p-2 text-[#3d4a61]">Plaintext</th>
              <th className="text-left p-2 text-[#3d4a61]">Time</th>
              <th className="text-left p-2 text-[#3d4a61]">Source</th>
              <th className="text-left p-2 text-[#3d4a61]">Export</th>
            </tr>
          </thead>
          <tbody>
            {crackedResults.map((res, i) => (
              <tr key={i} className="border-b border-[#1e2535] hover:bg-[#0f1319]">
                <td className="p-2 font-mono text-cyan-400">{res.hash}</td>
                <td className="p-2">{res.type}</td>
                <td className="p-2 text-green-400">{res.plaintext}</td>
                <td className="p-2 text-[#6b7a96]">{res.time}</td>
                <td className="p-2">{res.source}</td>
                <td className="p-2">
                  <ActionButton size="sm">Export</ActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-2 flex justify-between items-center border-t border-[#1e2535]">
          <span className="text-[10px] text-[#6b7a96]">
            Total cracked: {crackedResults.length} / {hashQueue.length}
          </span>
          <ToolbarButton variant="green">Export All to Vault</ToolbarButton>
        </div>
      </div>
    </div>
  );
}

// ---- Rules Manager Tab ----
function TabRulesManager() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="flex justify-between items-center mb-2">
        <SectionTitle>Hashcat Rules</SectionTitle>
        <ToolbarButton variant="cyan">+ New Rule</ToolbarButton>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rules.map((rule) => (
          <div key={rule.name} className="bg-[#111520] border border-[#1e2535] rounded p-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-mono text-cyan-400">{rule.name}</span>
              <Badge color={rule.enabled ? 'green' : 'gray'}>
                {rule.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="text-[9px] text-[#6b7a96] mt-1">{rule.description}</div>
            <div className="text-[8px] text-[#3d4a61]">Source: {rule.source}</div>
            <div className="flex gap-2 mt-2">
              <ActionButton size="sm">Edit</ActionButton>
              <ActionButton size="sm" variant="red">
                Delete
              </ActionButton>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 p-2 bg-[#111520] border border-[#1e2535] rounded">
        <SectionTitle>Preview Rule Effects (sample: "password")</SectionTitle>
        <div className="flex flex-wrap gap-1 text-[10px] font-mono">
          <span className="text-green-400">password</span>
          <span className="text-cyan-400">
            → Password, passw0rd, p@ssword, password1, passworD, password!...
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- Wordlist Manager Tab ----
function TabWordlistManager() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="flex justify-between items-center mb-2">
        <SectionTitle>Wordlists</SectionTitle>
        <ToolbarButton variant="cyan">+ Upload Wordlist</ToolbarButton>
      </div>
      <table className="w-full text-[10px]">
        <thead className="border-b border-[#1e2535] bg-[#0f1319]">
          <tr>
            <th className="text-left p-2">Name</th>
            <th className="text-left p-2">Size</th>
            <th className="text-left p-2">Lines</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {wordlists.map((w) => (
            <tr key={w.name} className="border-b border-[#1e2535] hover:bg-[#0f1319]">
              <td className="p-2 font-mono text-cyan-400">{w.name}</td>
              <td className="p-2">{w.size}</td>
              <td className="p-2">{w.lines.toLocaleString()}</td>
              <td className="p-2">
                <Badge color="green">{w.status}</Badge>
              </td>
              <td className="p-2 flex gap-1">
                <ActionButton size="sm">Use</ActionButton>
                <ActionButton size="sm" variant="red">
                  Delete
                </ActionButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- GPU Status Tab ----
function TabGPUStatus() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="flex items-center gap-2 mb-3">
        <PulseIndicator color="green" /> All GPUs active
      </div>
      <div className="grid grid-cols-2 gap-3">
        {gpuDevices.map((device) => (
          <div key={device.id} className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[12px] font-semibold text-cyan-400">{device.name}</div>
              <Badge color="green">{device.status}</Badge>
            </div>
            <KVRow label="Memory" value={device.memory} />
            <KVRow label="Utilization" value={`${device.utilization}%`} />
            <KVRow
              label="Temperature"
              value={`${device.temperature}°C`}
              valueColor={device.temperature > 75 ? 'text-amber-400' : 'text-green-400'}
            />
            <KVRow label="Clocks" value={device.clocks} />
            <KVRow label="Hashrate" value={device.hashrate} valueColor="text-amber-400" />
            <ProgressBar pct={device.utilization} color="cyan" className="mt-2" />
          </div>
        ))}
      </div>
      <div className="mt-3 p-2 bg-[#111520] border border-[#1e2535] rounded">
        <SectionTitle>Global Stats</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <KVRow label="Total Hashrate" value="23.7 GH/s" valueColor="text-amber-400" />
          <KVRow label="Total Power" value="~520W" />
          <KVRow label="Efficiency" value="45.6 MH/s per Watt" />
          <KVRow label="GPUs Active" value="2 / 2" />
          <KVRow label="Temperature Avg" value="75°C" />
          <KVRow label="Cracked today" value="47" valueColor="text-green-400" />
        </div>
      </div>
    </div>
  );
}

// ---- Online Lookup Tab ----
function TabOnlineLookup() {
  const [lookupHash, setLookupHash] = useState('');
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="bg-[#111520] border border-[#1e2535] rounded p-3 mb-3">
        <SectionTitle>Quick Lookup</SectionTitle>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter hash (MD5, SHA1, NTLM...)"
            value={lookupHash}
            onChange={(e) => setLookupHash(e.target.value)}
            className="flex-1 h-7 bg-[#0f1319] border border-[#252e42] rounded text-[10px] px-2 text-[#c5cfe0]"
          />
          <ToolbarButton variant="cyan">Lookup</ToolbarButton>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {onlineServices.map((service) => (
          <div
            key={service.name}
            className="bg-[#111520] border border-[#1e2535] rounded p-2 flex justify-between items-center"
          >
            <div>
              <div className="text-[11px] font-semibold text-cyan-400">{service.name}</div>
              <div className="text-[9px] text-[#6b7a96]">{service.rate}</div>
            </div>
            <ActionButton size="sm" variant="cyan">
              Open
            </ActionButton>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 4. MAIN EXPORT
// ============================================================================

const TABS = [
  'Hash Input',
  'Attack Config',
  'Hashcat Output',
  'Results',
  'Rules',
  'Wordlists',
  'GPU Status',
  'Online Lookup',
] as const;

export function Cracking() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);
  const crackedCount = hashQueue.filter((h) => h.status === 'cracked').length;
  const totalCount = hashQueue.length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModuleTabBar
        tabs={TABS}
        active={activeTab}
        onTabChange={setActiveTab}
        activeColor="text-amber-400 border-amber-400 bg-amber-500/5"
      />
      <Toolbar>
        <ToolbarButton variant="red">▶ Start Attack</ToolbarButton>
        <ToolbarButton variant="amber">Stop</ToolbarButton>
        <ToolbarButton>Import Hashes</ToolbarButton>
        <ToolbarButton>Rainbow Table</ToolbarButton>
        <ToolbarButton>Online Lookup</ToolbarButton>
        <TbSep />
        <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] whitespace-nowrap">
          Mode:
        </span>
        <ToolbarButton variant="cyan">Wordlist</ToolbarButton>
        <ToolbarButton>Rules</ToolbarButton>
        <ToolbarButton>Bruteforce</ToolbarButton>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-[10px]">
          <PulseIndicator /> {crackedCount}/{totalCount} cracked
        </div>
        <ToolbarButton className="ml-2">Export Cracked</ToolbarButton>
      </Toolbar>
      {activeTab === 'Hash Input' && <TabHashInput />}
      {activeTab === 'Attack Config' && <TabAttackConfig />}
      {activeTab === 'Hashcat Output' && <TabHashcatOutput />}
      {activeTab === 'Results' && <TabResults />}
      {activeTab === 'Rules' && <TabRulesManager />}
      {activeTab === 'Wordlists' && <TabWordlistManager />}
      {activeTab === 'GPU Status' && <TabGPUStatus />}
      {activeTab === 'Online Lookup' && <TabOnlineLookup />}
    </div>
  );
}
