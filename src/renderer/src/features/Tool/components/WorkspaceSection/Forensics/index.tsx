// src/renderer/src/features/Tool/components/WorkspaceSection/Forensics/index.tsx
import { useState } from 'react'
import { cn } from '../../../../../shared/lib/utils'
import { Badge, ModuleTabBar, ToolbarButton, ActionButton } from '../../../../../core/components/ui'

// ============================================================================
// 1. MOCK DATA (PHONG PHÚ)
// ============================================================================

// --- Hex View Data (PE file sample) ---
type ByteType = 'str' | 'hl' | 'null' | ''
interface HexByte { value: string; type: ByteType }
interface HexRowData { offset: string; bytes: HexByte[]; ascii: string; asciiType?: 'str' | 'hl' | '' }

const HEX_ROWS: HexRowData[] = [
  { offset: '00000000', bytes: [
    { value: '4D', type: 'str' }, { value: '5A', type: 'str' }, { value: '90', type: '' }, { value: '00', type: '' },
    { value: '03', type: '' }, { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' },
    { value: '04', type: '' }, { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' },
    { value: 'FF', type: '' }, { value: 'FF', type: '' }, { value: 'B8', type: 'hl' }, { value: '00', type: 'hl' }
  ], ascii: 'MZ........', asciiType: '' },
  { offset: '00000010', bytes: [
    { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' },
    { value: '40', type: '' }, { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' },
    { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' },
    { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' }
  ], ascii: '....@...........', asciiType: '' },
  { offset: '00000030', bytes: [
    { value: '68', type: 'str' }, { value: '74', type: 'str' }, { value: '74', type: 'str' }, { value: '70', type: 'str' },
    { value: '3A', type: 'str' }, { value: '2F', type: 'str' }, { value: '2F', type: 'str' }, { value: '63', type: 'str' },
    { value: '32', type: 'str' }, { value: '2E', type: 'str' }, { value: '65', type: 'str' }, { value: '76', type: 'str' },
    { value: '69', type: 'str' }, { value: '6C', type: 'str' }, { value: '2E', type: 'str' }, { value: '63', type: 'str' }
  ], ascii: 'http://c2.evil.c', asciiType: 'str' },
  { offset: '00000040', bytes: [
    { value: '6F', type: 'str' }, { value: '6D', type: 'str' }, { value: '2F', type: 'str' }, { value: '62', type: 'str' },
    { value: '65', type: 'str' }, { value: '61', type: 'str' }, { value: '63', type: 'str' }, { value: '6F', type: 'str' },
    { value: '6E', type: 'str' }, { value: '00', type: 'null' }, { value: '50', type: '' }, { value: '45', type: '' },
    { value: '00', type: 'null' }, { value: '00', type: 'null' }, { value: '64', type: '' }, { value: '86', type: '' }
  ], ascii: 'om/beacon.PE..d.', asciiType: 'str' },
  { offset: '00000050', bytes: [
    { value: '60', type: 'hl' }, { value: '72', type: 'hl' }, { value: '65', type: 'hl' }, { value: '67', type: 'hl' },
    { value: '73', type: 'hl' }, { value: '76', type: 'hl' }, { value: '72', type: 'hl' }, { value: '33', type: 'hl' },
    { value: '32', type: 'hl' }, { value: '00', type: 'null' }, { value: '50', type: '' }, { value: '45', type: '' },
    { value: '00', type: 'null' }, { value: '00', type: 'null' }, { value: '64', type: '' }, { value: '86', type: '' }
  ], ascii: 'regsvr32..PE..d.', asciiType: 'hl' },
  { offset: '00000060', bytes: [
    { value: 'E8', type: '' }, { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' },
    { value: 'E9', type: '' }, { value: 'B0', type: '' }, { value: '10', type: '' }, { value: '00', type: '' },
    { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' },
    { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' }, { value: '00', type: '' }
  ], ascii: '..............', asciiType: '' },
]

// --- Strings extracted from the binary ---
const extractedStrings = [
  { offset: 0x30, string: 'http://c2.evil.com/beacon', type: 'URL', context: 'C2 communication' },
  { offset: 0x50, string: 'regsvr32.exe', type: 'Process', context: 'Command execution' },
  { offset: 0x62, string: 'cmd.exe /c whoami', type: 'Command', context: 'Reconnaissance' },
  { offset: 0x80, string: 'VirtualAllocEx', type: 'API', context: 'Memory allocation' },
  { offset: 0x95, string: 'WriteProcessMemory', type: 'API', context: 'Process injection' },
  { offset: 0xAC, string: 'CreateRemoteThread', type: 'API', context: 'Code execution' },
  { offset: 0xC0, string: 'Global\\MalwareMutex2024', type: 'Mutex', context: 'Single instance' },
  { offset: 0xE2, string: 'Software\\Microsoft\\Windows\\CurrentVersion\\Run', type: 'Registry', context: 'Persistence' },
  { offset: 0x110, string: 'svchost32.exe', type: 'Filename', context: 'Dropped file' },
  { offset: 0x130, string: 'C:\\Users\\Public\\temp.dat', type: 'Path', context: 'Write location' },
]

// --- PCAP Data (network capture) ---
interface Packet {
  no: number
  time: string
  src: string
  dst: string
  proto: string
  length: number
  info: string
  highlight?: boolean
}

const pcapPackets: Packet[] = [
  { no: 1, time: '0.000000', src: '192.168.1.20', dst: '10.10.14.5', proto: 'TCP', length: 74, info: '44444 → 8080 [SYN] Seq=0 Win=64240' },
  { no: 2, time: '0.000045', src: '10.10.14.5', dst: '192.168.1.20', proto: 'TCP', length: 74, info: '8080 → 44444 [SYN, ACK] Seq=0 Ack=1' },
  { no: 3, time: '0.000089', src: '192.168.1.20', dst: '10.10.14.5', proto: 'HTTP', length: 312, info: 'POST /beacon HTTP/1.1', highlight: true },
  { no: 4, time: '0.000120', src: '10.10.14.5', dst: '192.168.1.20', proto: 'HTTP', length: 189, info: 'HTTP/1.1 200 OK' },
  { no: 5, time: '0.010204', src: '192.168.1.20', dst: '8.8.8.8', proto: 'DNS', length: 62, info: 'Standard query A c2.evil.com' },
  { no: 6, time: '0.020412', src: '8.8.8.8', dst: '192.168.1.20', proto: 'DNS', length: 88, info: 'Standard query response A 45.33.32.156' },
  { no: 7, time: '0.021500', src: '192.168.1.20', dst: '45.33.32.156', proto: 'TCP', length: 74, info: '44445 → 80 [SYN]' },
  { no: 8, time: '0.022100', src: '45.33.32.156', dst: '192.168.1.20', proto: 'TCP', length: 74, info: '80 → 44445 [SYN, ACK]' },
  { no: 9, time: '0.022400', src: '192.168.1.20', dst: '45.33.32.156', proto: 'HTTP', length: 2048, info: 'POST /gate.php (encrypted payload)', highlight: true },
  { no: 10, time: '1.000000', src: '192.168.1.20', dst: '45.33.32.156', proto: 'HTTP', length: 512, info: 'POST /gate.php (heartbeat)', highlight: true },
  { no: 11, time: '2.003451', src: '192.168.1.20', dst: '45.33.32.156', proto: 'HTTP', length: 512, info: 'POST /gate.php (heartbeat)' },
  { no: 12, time: '3.002013', src: '192.168.1.20', dst: '45.33.32.156', proto: 'HTTP', length: 512, info: 'POST /gate.php (heartbeat)' },
]

// --- Memory Analysis Data ---
interface MemoryRegion {
  start: string
  end: string
  size: string
  protection: string
  mappedFile: string
  suspicious: boolean
}

const memoryRegions: MemoryRegion[] = [
  { start: '0x00400000', end: '0x0040D000', size: '52 KB', protection: 'RX', mappedFile: 'malware.exe', suspicious: true },
  { start: '0x00500000', end: '0x00620000', size: '1.1 MB', protection: 'RW', mappedFile: 'Heap', suspicious: false },
  { start: '0x7FFE0000', end: '0x7FFE1000', size: '4 KB', protection: 'R', mappedFile: 'KUSER_SHARED_DATA', suspicious: false },
  { start: '0x0000012345600000', end: '0x00000123456A0000', size: '640 KB', protection: 'RWX', mappedFile: 'shellcode', suspicious: true },
  { start: '0x6F000000', end: '0x6F100000', size: '1 MB', protection: 'RX', mappedFile: 'kernel32.dll', suspicious: false },
  { start: '0x0000023410000000', end: '0x0000023410020000', size: '128 KB', protection: 'RW', mappedFile: 'Process Environment Block', suspicious: false },
]

// --- Timeline Events ---
interface TimelineEvent {
  time: string
  type: 'file' | 'network' | 'process' | 'registry' | 'api'
  description: string
  details: string
  severity: 'high' | 'medium' | 'low' | 'critical'
}

const timelineEvents: TimelineEvent[] = [
  { time: '09:30:01', type: 'process', description: 'Process created: malware.exe (PID 4212)', details: 'Parent: explorer.exe', severity: 'high' },
  { time: '09:30:02', type: 'file', description: 'File created: %TEMP%\\svchost32.exe', details: 'Size: 48,320 bytes', severity: 'high' },
  { time: '09:30:03', type: 'registry', description: 'Registry key created: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', details: 'Value: "svchost32" = "%TEMP%\\svchost32.exe"', severity: 'high' },
  { time: '09:30:04', type: 'network', description: 'DNS query: c2.evil.com', details: 'Resolved to 45.33.32.156', severity: 'medium' },
  { time: '09:30:05', type: 'network', description: 'HTTP POST to 45.33.32.156:80 /beacon', details: 'User-Agent: Mozilla/5.0', severity: 'high' },
  { time: '09:30:06', type: 'api', description: 'VirtualAllocEx called on PID 4212', details: 'Size: 0x1000, Protection: RWX', severity: 'high' },
  { time: '09:30:07', type: 'api', description: 'WriteProcessMemory: shellcode injection', details: 'Target: lsass.exe', severity: 'critical' },
  { time: '09:30:08', type: 'process', description: 'Process created: cmd.exe /c whoami', details: 'Parent: malware.exe', severity: 'medium' },
  { time: '09:30:10', type: 'file', description: 'File written: C:\\Users\\Public\\credentials.txt', details: 'Containing plaintext passwords', severity: 'high' },
]

// --- YARA Scan Results ---
interface YARAMatch {
  rule: string
  description: string
  tags: string[]
  matches: { offset: number; data: string }[]
}

const yaraMatches: YARAMatch[] = [
  {
    rule: 'CobaltStrike_Beacon',
    description: 'Detects Cobalt Strike beacon configuration',
    tags: ['c2', 'beacon', 'cobaltstrike'],
    matches: [{ offset: 0x1230, data: 'c2.evil.com' }, { offset: 0x1250, data: 'WateringHole2024' }]
  },
  {
    rule: 'Windows_Persistence_RunKey',
    description: 'Detects registry run key modification',
    tags: ['persistence', 'registry'],
    matches: [{ offset: 0xE2, data: 'Software\\Microsoft\\Windows\\CurrentVersion\\Run' }]
  },
  {
    rule: 'Injection_API_Sequence',
    description: 'VirtualAllocEx + WriteProcessMemory + CreateRemoteThread',
    tags: ['injection', 'api'],
    matches: [{ offset: 0x80, data: 'VirtualAllocEx' }, { offset: 0x95, data: 'WriteProcessMemory' }, { offset: 0xAC, data: 'CreateRemoteThread' }]
  }
]

// ============================================================================
// 2. UI COMPONENTS
// ============================================================================

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">{children}</div>
)
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-2">{children}</div>
)

const BYTE_COLOR: Record<ByteType, string> = {
  str: 'text-green-400 font-bold', hl: 'text-cyan-400 font-bold',
  null: 'text-[#3d4a61]', '': 'text-[#6b7a96]',
}

function HexViewer() {
  return (
    <div className="flex-1 overflow-y-auto p-3 font-mono">
      {HEX_ROWS.map((row) => (
        <div key={row.offset} className="flex gap-4 text-[10.5px] leading-8">
          <span className="text-[#3d4a61] w-14 shrink-0">{row.offset}</span>
          <div className="flex flex-wrap gap-1 flex-1">
            {row.bytes.map((b, i) => <span key={i} className={BYTE_COLOR[b.type]}>{b.value}</span>)}
          </div>
          <span className={cn('text-[#6b7a96] min-w-[110px] shrink-0', row.asciiType === 'str' && 'text-green-400', row.asciiType === 'hl' && 'text-cyan-400')}>
            {row.ascii}
          </span>
        </div>
      ))}
    </div>
  )
}

function StringsExtractionTab() {
  const [filter, setFilter] = useState('')
  const filtered = extractedStrings.filter(s => s.string.toLowerCase().includes(filter.toLowerCase()) || s.type.toLowerCase().includes(filter.toLowerCase()))
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="flex gap-2 mb-3">
        <input type="text" placeholder="Filter strings..." value={filter} onChange={e => setFilter(e.target.value)} className="flex-1 h-7 bg-[#111520] border border-[#252e42] rounded text-[10px] px-2 text-[#c5cfe0]" />
        <ToolbarButton size="sm">Export CSV</ToolbarButton>
      </div>
      <table className="w-full text-[10px]">
        <thead className="border-b border-[#1e2535] bg-[#0f1319]">
          <tr><th className="text-left p-2">Offset</th><th className="text-left p-2">String</th><th className="text-left p-2">Type</th><th className="text-left p-2">Context</th></tr>
        </thead>
        <tbody>
          {filtered.map((s, i) => (
            <tr key={i} className="border-b border-[#1e2535] hover:bg-[#111520]">
              <td className="p-2 font-mono text-cyan-400">0x{s.offset.toString(16)}</td>
              <td className="p-2 font-mono text-green-400">{s.string}</td>
              <td className="p-2"><Badge color="gray">{s.type}</Badge></td>
              <td className="p-2 text-[#6b7a96]">{s.context}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PCAPAnalysisTab() {
  const [filter, setFilter] = useState('')
  const filteredPackets = pcapPackets.filter(p => p.info.toLowerCase().includes(filter.toLowerCase()) || p.proto.toLowerCase().includes(filter.toLowerCase()))
  return (
    <div className="flex-1 overflow-y-auto bg-[#080a0e]">
      <div className="sticky top-0 bg-[#0f1319] p-2 border-b border-[#1e2535] flex gap-2">
        <input type="text" placeholder="Filter packets..." value={filter} onChange={e => setFilter(e.target.value)} className="flex-1 h-7 bg-[#111520] border border-[#252e42] rounded text-[10px] px-2" />
        <ToolbarButton size="sm">Apply BPF</ToolbarButton>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead className="border-b border-[#1e2535] bg-[#0f1319]">
            <tr><th className="p-2">No.</th><th className="p-2">Time</th><th className="p-2">Source</th><th className="p-2">Destination</th><th className="p-2">Protocol</th><th className="p-2">Length</th><th className="p-2">Info</th></tr>
          </thead>
          <tbody>
            {filteredPackets.map(p => (
              <tr key={p.no} className={cn('border-b border-[#1e2535] hover:bg-[#111520]', p.highlight && 'bg-red-500/5')}>
                <td className="p-2 text-[#6b7a96]">{p.no}</td>
                <td className="p-2 font-mono text-[#6b7a96]">{p.time}</td>
                <td className="p-2 text-cyan-400">{p.src}</td>
                <td className="p-2">{p.dst}</td>
                <td className="p-2"><Badge color="gray">{p.proto}</Badge></td>
                <td className="p-2 text-right">{p.length}</td>
                <td className={cn('p-2', p.highlight ? 'text-red-400' : 'text-[#c5cfe0]')}>{p.info}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MemoryAnalysisTab() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e] space-y-3">
      <div>
        <SectionTitle>Process: malware.exe (PID 4212)</SectionTitle>
        <table className="w-full text-[10px]">
          <thead className="border-b border-[#1e2535]">
            <tr><th className="text-left p-1">Start</th><th className="text-left p-1">End</th><th className="text-left p-1">Size</th><th className="text-left p-1">Protection</th><th className="text-left p-1">Mapped File</th></tr>
          </thead>
          <tbody>
            {memoryRegions.map((r, i) => (
              <tr key={i} className={cn('border-b border-[#1e2535]', r.suspicious && 'bg-red-500/5')}>
                <td className="p-1 font-mono text-cyan-400">{r.start}</td>
                <td className="p-1 font-mono">{r.end}</td>
                <td className="p-1">{r.size}</td>
                <td className="p-1"><Badge color={r.protection.includes('X') ? 'red' : 'gray'}>{r.protection}</Badge></td>
                <td className="p-1">{r.mappedFile}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-[#111520] border border-red-500/20 rounded p-2">
        <div className="text-[11px] font-bold text-red-400 mb-1">⚠ Suspicious Memory Regions</div>
        <div className="text-[10px] text-[#c5cfe0]">Region at 0x0000012345600000 has RWX protection and contains shellcode matching Cobalt Strike.</div>
        <ActionButton size="sm" variant="red" className="mt-2">Dump Memory Region</ActionButton>
      </div>
    </div>
  )
}

function TimelineTab() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="relative border-l border-[#1e2535] ml-4">
        {timelineEvents.map((e, i) => (
          <div key={i} className="mb-4 ml-6 relative">
            <div className={cn('absolute -left-[25px] w-3 h-3 rounded-full', 
              e.severity === 'critical' ? 'bg-red-500' : e.severity === 'high' ? 'bg-amber-500' : 'bg-cyan-500')}></div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[10px] text-[#6b7a96] font-mono">{e.time}</span>
              <Badge color={e.type === 'process' ? 'cyan' : e.type === 'network' ? 'amber' : e.type === 'file' ? 'green' : 'purple'}>{e.type}</Badge>
              <span className="text-[11px] font-semibold text-[#c5cfe0]">{e.description}</span>
            </div>
            <div className="text-[9.5px] text-[#6b7a96]">{e.details}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function YARAScanTab() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e] space-y-3">
      <div className="flex justify-between items-center mb-2">
        <SectionTitle>YARA Scan Results (3 hits)</SectionTitle>
        <ToolbarButton variant="cyan">Run YARA Again</ToolbarButton>
      </div>
      {yaraMatches.map((match, i) => (
        <div key={i} className="bg-[#111520] border border-[#1e2535] rounded p-2">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[11px] font-mono text-red-400">{match.rule}</span>
            <div className="flex gap-1">{match.tags.map(t => <Badge key={t} color="gray">{t}</Badge>)}</div>
          </div>
          <div className="text-[9.5px] text-[#c5cfe0] mb-2">{match.description}</div>
          <div className="bg-[#0f1319] p-1 rounded">
            {match.matches.map((m, idx) => (
              <div key={idx} className="text-[9px] font-mono">0x{m.offset.toString(16)}: {m.data}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// 3. MAIN EXPORT
// ============================================================================

const TABS = ['Hex View', 'Strings Extraction', 'PCAP Analysis', 'Memory Analysis', 'Timeline', 'YARA Scan'] as const

export function Forensics() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Hex View': return <HexViewer />
      case 'Strings Extraction': return <StringsExtractionTab />
      case 'PCAP Analysis': return <PCAPAnalysisTab />
      case 'Memory Analysis': return <MemoryAnalysisTab />
      case 'Timeline': return <TimelineTab />
      case 'YARA Scan': return <YARAScanTab />
      default: return null
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModuleTabBar
        tabs={TABS}
        active={activeTab}
        onTabChange={setActiveTab}
        activeColor="text-purple-400 border-purple-400 bg-purple-500/5"
      />
      <Toolbar>
        <ToolbarButton variant="cyan">Open File</ToolbarButton>
        <ToolbarButton>Memory Dump</ToolbarButton>
        <ToolbarButton>Strings Extract</ToolbarButton>
        <ToolbarButton>PCAP Analyze</ToolbarButton>
        <ToolbarButton>Entropy Scan</ToolbarButton>
        <ToolbarButton variant="amber">YARA Scan</ToolbarButton>
        <span className="ml-3 text-[10px] text-[#6b7a96] font-mono truncate">
          malware_sample.bin — 48,320 bytes — MD5: a1b2c3d4e5f6…
        </span>
        <ToolbarButton className="ml-auto">Export Report</ToolbarButton>
      </Toolbar>
      <div className="flex-1 overflow-hidden bg-[#141924]">
        {renderTabContent()}
      </div>
    </div>
  )
}