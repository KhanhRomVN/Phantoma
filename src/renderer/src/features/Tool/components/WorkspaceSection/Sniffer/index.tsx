// src/renderer/src/features/Tool/components/WorkspaceSection/Sniffer/index.tsx
import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import {
  Badge,
  KVRow,
  ModuleTabBar,
  ToolbarButton,
  ProgressBar,
  ActionButton,
} from '../../../../../core/components/ui';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-2">
    {children}
  </div>
);

// ============================================================================
// 1. MOCK DATA (CHI TIẾT CHO NETWORK SNIFFER)
// ============================================================================

interface Packet {
  no: number;
  time: string;
  src: string;
  dst: string;
  proto: string;
  protoColor: string;
  length: number;
  info: string;
  alert: boolean;
  details?: string;
}

const packets: Packet[] = [
  {
    no: 1,
    time: '0.000000',
    src: '192.168.1.20',
    dst: '10.10.14.5',
    proto: 'TCP',
    protoColor: 'text-green-400',
    length: 74,
    info: '44444 → 8080 [SYN] Seq=0',
    alert: false,
  },
  {
    no: 2,
    time: '0.000045',
    src: '10.10.14.5',
    dst: '192.168.1.20',
    proto: 'TCP',
    protoColor: 'text-green-400',
    length: 74,
    info: '8080 → 44444 [SYN, ACK]',
    alert: false,
  },
  {
    no: 3,
    time: '0.000089',
    src: '192.168.1.20',
    dst: '10.10.14.5',
    proto: 'HTTP',
    protoColor: 'text-purple-400',
    length: 312,
    info: 'POST /beacon HTTP/1.1 (C2!)',
    alert: true,
    details: 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  },
  {
    no: 4,
    time: '0.000120',
    src: '10.10.14.5',
    dst: '192.168.1.20',
    proto: 'HTTP',
    protoColor: 'text-purple-400',
    length: 189,
    info: 'HTTP/1.1 200 OK',
    alert: false,
  },
  {
    no: 5,
    time: '0.010204',
    src: '192.168.1.10',
    dst: '8.8.8.8',
    proto: 'DNS',
    protoColor: 'text-amber-400',
    length: 62,
    info: 'Standard query A c2.evil.com',
    alert: false,
  },
  {
    no: 6,
    time: '0.020412',
    src: '8.8.8.8',
    dst: '192.168.1.10',
    proto: 'DNS',
    protoColor: 'text-amber-400',
    length: 88,
    info: 'Standard query response A 45.33.32.156',
    alert: false,
  },
  {
    no: 7,
    time: '0.021500',
    src: '192.168.1.20',
    dst: '45.33.32.156',
    proto: 'TCP',
    protoColor: 'text-green-400',
    length: 74,
    info: '44445 → 80 [SYN]',
    alert: false,
  },
  {
    no: 8,
    time: '0.022100',
    src: '45.33.32.156',
    dst: '192.168.1.20',
    proto: 'TCP',
    protoColor: 'text-green-400',
    length: 74,
    info: '80 → 44445 [SYN, ACK]',
    alert: false,
  },
  {
    no: 9,
    time: '0.022400',
    src: '192.168.1.20',
    dst: '45.33.32.156',
    proto: 'HTTP',
    protoColor: 'text-purple-400',
    length: 2048,
    info: 'POST /gate.php — Encrypted payload',
    alert: true,
    details: 'Payload size: 2048 bytes, AES-256 encrypted',
  },
  {
    no: 10,
    time: '1.000000',
    src: '192.168.1.20',
    dst: '45.33.32.156',
    proto: 'HTTP',
    protoColor: 'text-purple-400',
    length: 512,
    info: 'POST /gate.php (heartbeat)',
    alert: true,
  },
  {
    no: 11,
    time: '2.003451',
    src: '192.168.1.20',
    dst: '45.33.32.156',
    proto: 'HTTP',
    protoColor: 'text-purple-400',
    length: 512,
    info: 'POST /gate.php (heartbeat)',
    alert: false,
  },
  {
    no: 12,
    time: '0.050123',
    src: '192.168.1.5',
    dst: '192.168.1.1',
    proto: 'ARP',
    protoColor: 'text-pink-400',
    length: 42,
    info: 'Who has 192.168.1.1? Tell 192.168.1.5',
    alert: false,
  },
  {
    no: 13,
    time: '0.050201',
    src: '192.168.1.1',
    dst: '192.168.1.5',
    proto: 'ARP',
    protoColor: 'text-pink-400',
    length: 42,
    info: '192.168.1.1 is at 00:1A:2B:3C:4D:5E',
    alert: false,
  },
];

interface ProtocolStat {
  label: string;
  pct: number;
  color: 'green' | 'amber' | 'purple' | 'red' | 'cyan';
  packets: number;
}

const protocolStats: ProtocolStat[] = [
  { label: 'TCP', pct: 62, color: 'green', packets: 845 },
  { label: 'DNS', pct: 18, color: 'amber', packets: 245 },
  { label: 'HTTP', pct: 12, color: 'purple', packets: 163 },
  { label: 'ARP', pct: 5, color: 'red', packets: 68 },
  { label: 'UDP', pct: 3, color: 'cyan', packets: 41 },
];

// ARP Spoof / MITM configuration
const arpSpoofConfig = {
  enabled: false,
  interface: 'eth0',
  target: '192.168.1.20',
  gateway: '192.168.1.1',
  spoofBoth: true,
  active: false,
};

// Filter presets
const filterPresets = [
  { name: 'HTTP only', filter: 'tcp port 80 or tcp port 443', description: 'Web traffic' },
  { name: 'DNS queries', filter: 'udp port 53', description: 'DNS lookups' },
  { name: 'C2 traffic', filter: 'host 45.33.32.156', description: 'Suspicious C2 server' },
  { name: 'ARP only', filter: 'arp', description: 'ARP requests/replies' },
];

// Decoded packet example (for Decode tab)
const decodedPacket = {
  frame: { number: 3, length: 312, captured: '0.000089', protocols: ['eth', 'ip', 'tcp', 'http'] },
  ethernet: { src: '08:00:27:AB:CD:EF', dst: '08:00:27:11:22:33', type: 'IPv4' },
  ip: {
    src: '192.168.1.20',
    dst: '10.10.14.5',
    version: 4,
    headerLength: 20,
    ttl: 64,
    protocol: 'TCP',
    totalLength: 298,
  },
  tcp: { srcPort: 44444, dstPort: 8080, seq: 123456789, ack: 0, flags: 'SYN', window: 64240 },
  http: {
    method: 'POST',
    uri: '/beacon',
    version: 'HTTP/1.1',
    headers: {
      Host: '10.10.14.5',
      'User-Agent': 'Mozilla/5.0',
      'Content-Type': 'application/json',
    },
    body: '{"beacon_id":"abc123"}',
  },
};

// Alerts (real-time)
const alerts = [
  {
    id: 1,
    time: '0.000089',
    severity: 'high',
    type: 'C2 Beacon',
    description: 'POST request to /beacon on non-standard port',
    src: '192.168.1.20',
    dst: '10.10.14.5',
    protocol: 'HTTP',
  },
  {
    id: 2,
    time: '0.022400',
    severity: 'critical',
    type: 'Encrypted Payload',
    description: 'Large POST to unknown endpoint, possible data exfiltration',
    src: '192.168.1.20',
    dst: '45.33.32.156',
    protocol: 'HTTP',
  },
  {
    id: 3,
    time: '1.000000',
    severity: 'medium',
    type: 'Periodic Beacon',
    description: 'Recurring POST every 60 seconds, typical C2 behavior',
    src: '192.168.1.20',
    dst: '45.33.32.156',
    protocol: 'HTTP',
  },
  {
    id: 4,
    time: '0.050123',
    severity: 'low',
    type: 'ARP Spoof',
    description: 'Multiple ARP replies from different MACs for same IP',
    src: '192.168.1.5',
    dst: '192.168.1.1',
    protocol: 'ARP',
  },
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

function PacketRow({
  packet,
  selected,
  onClick,
}: {
  packet: Packet;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center text-[10.5px] py-1.5 px-2 border-b border-[#1e2535]/40 hover:bg-white/[0.02] cursor-pointer',
        packet.alert && 'bg-red-500/4',
        selected && 'bg-cyan-500/10',
      )}
    >
      <span className="w-12 shrink-0 text-[#3d4a61] font-mono">{packet.no}</span>
      <span className="w-20 shrink-0 text-[#6b7a96] font-mono">{packet.time}</span>
      <span className="w-28 shrink-0 text-cyan-400 font-mono text-[9.5px] truncate">
        {packet.src}
      </span>
      <span className="w-28 shrink-0 text-[#c5cfe0] font-mono text-[9.5px] truncate">
        {packet.dst}
      </span>
      <span className={cn('w-14 shrink-0 text-center font-bold text-[10px]', packet.protoColor)}>
        {packet.proto}
      </span>
      <span className="w-12 shrink-0 text-right text-[#6b7a96]">{packet.length}</span>
      <span
        className={cn('flex-1 pl-2 truncate', packet.alert ? 'text-red-400' : 'text-[#6b7a96]')}
      >
        {packet.info}
      </span>
    </div>
  );
}

// ============================================================================
// 3. TAB COMPONENTS
// ============================================================================

function TabPacketCapture() {
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  return (
    <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
      <div className="flex flex-col bg-[#141924] overflow-hidden w-2/3">
        <div className="flex items-center justify-between px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
          <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">
            Packet Capture
          </span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-green-400">⬤ Capturing</span>
            <Badge color="cyan">{packets.length} packets</Badge>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="flex text-[9.5px] text-[#3d4a61] px-2 py-1.5 border-b border-[#1e2535] sticky top-0 bg-[#0f1319]">
            <span className="w-12">No.</span>
            <span className="w-20">Time</span>
            <span className="w-28">Source</span>
            <span className="w-28">Dest</span>
            <span className="w-14 text-center">Proto</span>
            <span className="w-12 text-right">Len</span>
            <span className="flex-1 pl-2">Info</span>
          </div>
          {packets.map((p) => (
            <PacketRow
              key={p.no}
              packet={p}
              selected={selectedPacket?.no === p.no}
              onClick={() => setSelectedPacket(p)}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col bg-[#141924] overflow-hidden w-1/3">
        <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
          <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">
            Packet Details
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 text-[10px]">
          {selectedPacket ? (
            <div className="space-y-2">
              <div className="bg-[#111520] rounded p-2">
                <SectionTitle>Frame</SectionTitle>
                <KVRow label="Number" value={selectedPacket.no.toString()} />
                <KVRow label="Time" value={selectedPacket.time} />
                <KVRow label="Length" value={`${selectedPacket.length} bytes`} />
              </div>
              <div className="bg-[#111520] rounded p-2">
                <SectionTitle>Ethernet</SectionTitle>
                <KVRow label="Source" value="08:00:27:AB:CD:EF" />
                <KVRow label="Destination" value="08:00:27:11:22:33" />
              </div>
              <div className="bg-[#111520] rounded p-2">
                <SectionTitle>IPv4</SectionTitle>
                <KVRow label="Source" value={selectedPacket.src} />
                <KVRow label="Destination" value={selectedPacket.dst} />
                <KVRow label="TTL" value="64" />
              </div>
              <div className="bg-[#111520] rounded p-2">
                <SectionTitle>{selectedPacket.proto}</SectionTitle>
                {selectedPacket.details && (
                  <div className="text-[#c5cfe0] break-all">{selectedPacket.details}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-[#6b7a96] py-4">Select a packet to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabProtocolStats() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Protocol Distribution</SectionTitle>
          {protocolStats.map((p) => (
            <div key={p.label} className="mb-2">
              <div className="flex justify-between text-[10px] text-[#6b7a96] mb-1">
                <span className={`text-${p.color}-400`}>{p.label}</span>
                <span>
                  {p.pct}% ({p.packets} packets)
                </span>
              </div>
              <ProgressBar pct={p.pct} color={p.color} />
            </div>
          ))}
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Top Talkers</SectionTitle>
          <KVRow label="192.168.1.20" value="847 packets (1.2 MB)" />
          <KVRow label="192.168.1.10" value="312 packets (48 KB)" />
          <KVRow label="45.33.32.156" value="156 packets (524 KB)" />
        </div>
        <div className="col-span-2 bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Traffic Timeline</SectionTitle>
          <div className="h-16 bg-[#0f1319] rounded flex items-end gap-[2px] p-1">
            <div className="bg-green-400 w-6 h-8" style={{ height: '8px' }}></div>
            <div className="bg-amber-400 w-6 h-4" style={{ height: '16px' }}></div>
            <div className="bg-purple-400 w-6 h-full" style={{ height: '48px' }}></div>
            <div className="bg-red-400 w-6 h-2"></div>
          </div>
          <div className="flex justify-between text-[9px] text-[#6b7a96] mt-1">
            <span>0s</span>
            <span>1s</span>
            <span>2s</span>
            <span>3s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabARPMITM() {
  const [active, setActive] = useState(arpSpoofConfig.active);
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>ARP Spoof / MITM Attack</SectionTitle>
          <KVRow
            label="Status"
            value={active ? 'Active' : 'Inactive'}
            valueColor={active ? 'text-red-400' : 'text-green-400'}
          />
          <KVRow label="Interface" value={arpSpoofConfig.interface} />
          <KVRow label="Target IP" value={arpSpoofConfig.target} valueColor="text-amber-400" />
          <KVRow label="Gateway IP" value={arpSpoofConfig.gateway} />
          <KVRow label="Spoof both" value={arpSpoofConfig.spoofBoth ? 'Yes' : 'No'} />
          <div className="mt-3 flex gap-2">
            <ActionButton variant={active ? 'red' : 'green'} onClick={() => setActive(!active)}>
              {active ? 'Stop Attack' : 'Start ARP Spoof'}
            </ActionButton>
            <ActionButton variant="amber">View Traffic</ActionButton>
          </div>
          {active && (
            <div className="mt-2 text-[9px] text-red-400">
              ⚠️ Actively redirecting traffic. Use only in authorized environments.
            </div>
          )}
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Captured Credentials (MITM)</SectionTitle>
          <KVRow
            label="HTTP Basic Auth"
            value="admin:admin123 (from 192.168.1.20)"
            valueColor="text-green-400"
          />
          <KVRow
            label="NTLMv2 Hash"
            value="alice:corp.local:$NETNTLMv2$..."
            valueColor="text-amber-400"
          />
          <KVRow label="Session Cookie" value="PHPSESSID=abc123 (from login.corp.local)" />
        </div>
      </div>
    </div>
  );
}

function TabFiltersBPF() {
  const [filter, setFilter] = useState('tcp port 80 or tcp port 443');
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="bg-[#111520] border border-[#1e2535] rounded p-3 mb-3">
        <SectionTitle>BPF Filter Expression</SectionTitle>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-[#0f1319] border border-[#252e42] rounded px-2 py-1 text-[11px] font-mono text-cyan-400"
        />
        <div className="text-[9px] text-[#6b7a96] mt-1">
          Examples: "host 192.168.1.20", "tcp port 80", "not arp", "src net 192.168.1.0/24"
        </div>
        <div className="flex gap-2 mt-2">
          <ToolbarButton variant="cyan">Apply</ToolbarButton>
          <ToolbarButton>Clear</ToolbarButton>
        </div>
      </div>
      <div>
        <SectionTitle>Presets</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {filterPresets.map((p) => (
            <div key={p.name} className="bg-[#111520] border border-[#1e2535] rounded p-2">
              <div className="text-[11px] font-semibold text-cyan-400">{p.name}</div>
              <div className="text-[9px] text-[#6b7a96]">{p.filter}</div>
              <div className="text-[8px] text-[#3d4a61]">{p.description}</div>
              <ActionButton size="sm" className="mt-1">
                Load
              </ActionButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabPacketDecode() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
        <SectionTitle>Decoded Packet (HTTP POST /beacon)</SectionTitle>
        <div className="space-y-2 font-mono text-[10px]">
          <div className="text-cyan-400">
            Frame 3: {decodedPacket.frame.length} bytes on wire ({decodedPacket.frame.captured})
          </div>
          <div className="pl-2">
            <span className="text-[#6b7a96]">Ethernet II, Src:</span> {decodedPacket.ethernet.src},{' '}
            <span className="text-[#6b7a96]">Dst:</span> {decodedPacket.ethernet.dst}
          </div>
          <div className="pl-2">
            <span className="text-[#6b7a96]">Internet Protocol Version 4, Src:</span>{' '}
            {decodedPacket.ip.src}, <span className="text-[#6b7a96]">Dst:</span>{' '}
            {decodedPacket.ip.dst}, <span className="text-[#6b7a96]">TTL:</span>{' '}
            {decodedPacket.ip.ttl}
          </div>
          <div className="pl-2">
            <span className="text-[#6b7a96]">Transmission Control Protocol, Src Port:</span>{' '}
            {decodedPacket.tcp.srcPort}, <span className="text-[#6b7a96]">Dst Port:</span>{' '}
            {decodedPacket.tcp.dstPort}, <span className="text-[#6b7a96]">Flags:</span>{' '}
            {decodedPacket.tcp.flags}
          </div>
          <div className="pl-2">
            <span className="text-[#6b7a96]">Hypertext Transfer Protocol</span>
            <br />
            {decodedPacket.http.method} {decodedPacket.http.uri} {decodedPacket.http.version}
            <br />
            Host: {decodedPacket.http.headers.Host}
            <br />
            User-Agent: {decodedPacket.http.headers['User-Agent']}
            <br />
            Body: {decodedPacket.http.body}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabPCAPExport() {
  const [exporting, setExporting] = useState(false);
  const handleExport = () => {
    setExporting(true);
    setTimeout(() => setExporting(false), 2000);
  };
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3 col-span-2">
          <SectionTitle>Export Capture</SectionTitle>
          <KVRow
            label="Format"
            value={
              <select className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5">
                <option>PCAPNG</option>
                <option>PCAP</option>
                <option>PCAPNG (compressed)</option>
              </select>
            }
          />
          <KVRow
            label="Filter packets"
            value={
              <input
                type="text"
                className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5 w-full"
                placeholder="BPF filter (optional)"
              />
            }
          />
          <KVRow
            label="Limit packets"
            value={
              <input
                type="number"
                className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5 w-24"
                placeholder="All"
              />
            }
          />
          <div className="flex gap-2 mt-2">
            <ToolbarButton variant="cyan" onClick={handleExport}>
              {exporting ? 'Exporting...' : 'Download PCAP'}
            </ToolbarButton>
            <ToolbarButton>Save to Workspace</ToolbarButton>
          </div>
          {exporting && <ProgressBar pct={100} color="cyan" className="mt-2" />}
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3 col-span-2">
          <SectionTitle>Recent Captures</SectionTitle>
          <div className="text-[10px] space-y-1">
            <div className="flex justify-between">
              <span>capture_20250604_0945.pcap</span>
              <span className="text-[#6b7a96]">2.3 MB</span>
              <ActionButton size="sm">Load</ActionButton>
            </div>
            <div>capture_20250603_1530.pcapng</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabAlerts() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="bg-[#111520] border border-[#1e2535] rounded">
        <table className="w-full text-[10px]">
          <thead className="border-b border-[#1e2535] bg-[#0f1319]">
            <tr>
              <th className="p-2">Time</th>
              <th className="p-2">Severity</th>
              <th className="p-2">Type</th>
              <th className="p-2">Description</th>
              <th className="p-2">Source</th>
              <th className="p-2">Destination</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-b border-[#1e2535]">
                <td className="p-2 text-[#6b7a96]">{a.time}</td>
                <td className="p-2">
                  <Badge
                    color={
                      a.severity === 'critical'
                        ? 'red'
                        : a.severity === 'high'
                          ? 'amber'
                          : a.severity === 'medium'
                            ? 'cyan'
                            : 'gray'
                    }
                  >
                    {a.severity}
                  </Badge>
                </td>
                <td className="p-2 text-cyan-400">{a.type}</td>
                <td className="p-2">{a.description}</td>
                <td className="p-2 text-cyan-400">{a.src}</td>
                <td className="p-2">{a.dst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// 4. MAIN EXPORT
// ============================================================================

const TABS = [
  'Packet Capture',
  'Protocol Stats',
  'ARP / MITM',
  'Filters & BPF',
  'Packet Decode',
  'PCAP Export',
  'Alerts',
] as const;

export function Sniffer() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModuleTabBar
        tabs={TABS}
        active={activeTab}
        onTabChange={setActiveTab}
        activeColor="text-green-400 border-green-400 bg-green-500/5"
      />
      <Toolbar>
        <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] whitespace-nowrap">
          Interface:
        </span>
        <select className="h-6 bg-[#111520] border border-[#252e42] rounded text-green-400 text-[11px] px-2 outline-none font-mono">
          <option>eth0 (192.168.1.5)</option>
          <option>tun0 (10.10.14.5)</option>
        </select>
        <TbSep />
        <ToolbarButton variant="green">▶ Start Capture</ToolbarButton>
        <ToolbarButton variant="red">■ Stop</ToolbarButton>
        <ToolbarButton variant="amber">ARP Spoof</ToolbarButton>
        <ToolbarButton variant="amber">MITM</ToolbarButton>
        <TbSep />
        <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em]">Filter:</span>
        <input
          readOnly
          value="tcp port 80 or port 443"
          className="h-6 w-44 bg-[#111520] border border-[#252e42] rounded text-[#c5cfe0] text-[11px] px-2 outline-none font-mono"
        />
        <ToolbarButton className="ml-auto">Save PCAP</ToolbarButton>
      </Toolbar>
      {activeTab === 'Packet Capture' && <TabPacketCapture />}
      {activeTab === 'Protocol Stats' && <TabProtocolStats />}
      {activeTab === 'ARP / MITM' && <TabARPMITM />}
      {activeTab === 'Filters & BPF' && <TabFiltersBPF />}
      {activeTab === 'Packet Decode' && <TabPacketDecode />}
      {activeTab === 'PCAP Export' && <TabPCAPExport />}
      {activeTab === 'Alerts' && <TabAlerts />}
    </div>
  );
}
