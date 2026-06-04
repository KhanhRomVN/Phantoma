// src/renderer/src/features/Tool/components/WorkspaceSection/Collab/index.tsx
import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import {
  Badge,
  ModuleTabBar,
  ToolbarButton,
  PulseIndicator,
  ActionButton,
  KVRow,
} from '../../../../../core/components/ui';

// ============================================================================
// 1. MOCK DATA CHI TIẾT
// ============================================================================

interface Operator {
  id: string;
  initials: string;
  name: string;
  role: 'Lead' | 'Member' | 'Observer';
  status: 'Online' | 'Away' | 'Busy';
  currentActivity: string;
  color: string;
  badgeColor: string;
  avatarBg: string;
  lastSeen: string;
}

const operators: Operator[] = [
  {
    id: 'op1',
    initials: 'RA',
    name: 'RedAlpha',
    role: 'Lead',
    status: 'Online',
    currentActivity: 'Post-Exploitation',
    color: 'text-cyan-400',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    avatarBg: 'bg-cyan-500/20',
    lastSeen: 'just now',
  },
  {
    id: 'op2',
    initials: 'SX',
    name: 'ShadowX',
    role: 'Member',
    status: 'Online',
    currentActivity: 'SQLi Automation',
    color: 'text-amber-400',
    badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    avatarBg: 'bg-amber-500/20',
    lastSeen: '2 min ago',
  },
  {
    id: 'op3',
    initials: 'GH',
    name: 'GhostHunter',
    role: 'Member',
    status: 'Away',
    currentActivity: 'Recon',
    color: 'text-purple-400',
    badgeColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    avatarBg: 'bg-purple-500/20',
    lastSeen: '15 min ago',
  },
  {
    id: 'op4',
    initials: 'VN',
    name: 'VoidNet',
    role: 'Observer',
    status: 'Online',
    currentActivity: 'Reporting',
    color: 'text-green-400',
    badgeColor: 'bg-green-500/10 text-green-400 border border-green-500/20',
    avatarBg: 'bg-green-500/20',
    lastSeen: 'just now',
  },
];

interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorBg: string;
  time: string;
  text: string;
  isHighlight: boolean;
  isSystem?: boolean;
  attachments?: { name: string; size: string; type: string }[];
}

const chatMessages: ChatMessage[] = [
  {
    id: 'msg1',
    authorId: 'op1',
    authorName: 'RedAlpha',
    authorInitials: 'RA',
    authorColor: 'text-cyan-400',
    authorBg: 'bg-cyan-500/20',
    time: '09:12',
    text: 'Got root on .20 via Log4Shell. Moving to DC next.',
    isHighlight: false,
  },
  {
    id: 'msg2',
    authorId: 'op2',
    authorName: 'ShadowX',
    authorInitials: 'SX',
    authorColor: 'text-amber-400',
    authorBg: 'bg-amber-500/20',
    time: '09:15',
    text: 'SQLi confirmed on login endpoint. Union-based, DB = corp_db.',
    isHighlight: false,
  },
  {
    id: 'msg3',
    authorId: 'op3',
    authorName: 'GhostHunter',
    authorInitials: 'GH',
    authorColor: 'text-purple-400',
    authorBg: 'bg-purple-500/20',
    time: '09:18',
    text: 'Found exposed .git repo at git.target.corp — cloning. Might have creds.',
    isHighlight: false,
  },
  {
    id: 'msg4',
    authorId: 'op1',
    authorName: 'RedAlpha',
    authorInitials: 'RA',
    authorColor: 'text-cyan-400',
    authorBg: 'bg-cyan-500/20',
    time: '09:31',
    text: '🎉 DOMAIN ADMIN on DC01! MS17-010 + hashdump. krbtgt hash extracted. Full golden ticket ready.',
    isHighlight: true,
  },
  {
    id: 'msg5',
    authorId: 'op2',
    authorName: 'ShadowX',
    authorInitials: 'SX',
    authorColor: 'text-amber-400',
    authorBg: 'bg-amber-500/20',
    time: '09:33',
    text: 'Admin hash cracked → P@ssw0rd! Also got 11 phishing creds.',
    isHighlight: false,
  },
  {
    id: 'msg6',
    authorId: 'op4',
    authorName: 'VoidNet',
    authorInitials: 'VN',
    authorColor: 'text-green-400',
    authorBg: 'bg-green-500/20',
    time: '09:35',
    text: 'Generating report with all findings. Will share in 5 min.',
    isHighlight: false,
  },
  {
    id: 'msg7',
    authorId: 'system',
    authorName: 'System',
    authorInitials: 'SY',
    authorColor: 'text-gray-400',
    authorBg: 'bg-gray-500/20',
    time: '09:40',
    text: 'Session #2 (192.168.1.20) shared with team.',
    isHighlight: false,
    isSystem: true,
  },
];

interface SharedSession {
  id: string;
  target: string;
  user: string;
  type: 'meterpreter' | 'shell' | 'ssh';
  privileges: string;
  sharedBy: string;
  sharedAt: string;
  expiresAt: string;
}

const sharedSessions: SharedSession[] = [
  {
    id: 'sess1',
    target: '192.168.1.10',
    user: 'SYSTEM',
    type: 'meterpreter',
    privileges: 'NT AUTHORITY\\SYSTEM',
    sharedBy: 'RedAlpha',
    sharedAt: '09:32',
    expiresAt: '10:32',
  },
  {
    id: 'sess2',
    target: '192.168.1.20',
    user: 'www-data',
    type: 'shell',
    privileges: 'www-data',
    sharedBy: 'RedAlpha',
    sharedAt: '09:33',
    expiresAt: '10:33',
  },
];

interface SharedFile {
  id: string;
  name: string;
  size: string;
  type: 'pcap' | 'log' | 'hashdump' | 'report' | 'screenshot';
  sharedBy: string;
  sharedAt: string;
  downloadCount: number;
}

const sharedFiles: SharedFile[] = [
  {
    id: 'file1',
    name: 'hashdump_20250602.txt',
    size: '4.2 KB',
    type: 'hashdump',
    sharedBy: 'RedAlpha',
    sharedAt: '09:35',
    downloadCount: 2,
  },
  {
    id: 'file2',
    name: 'network_scan_results.pcap',
    size: '128 MB',
    type: 'pcap',
    sharedBy: 'GhostHunter',
    sharedAt: '09:28',
    downloadCount: 3,
  },
  {
    id: 'file3',
    name: 'phishing_creds.csv',
    size: '12 KB',
    type: 'log',
    sharedBy: 'ShadowX',
    sharedAt: '09:40',
    downloadCount: 1,
  },
  {
    id: 'file4',
    name: 'screenshots_dc01.zip',
    size: '8.3 MB',
    type: 'screenshot',
    sharedBy: 'RedAlpha',
    sharedAt: '09:45',
    downloadCount: 0,
  },
];

interface ActivityLogEntry {
  id: string;
  timestamp: string;
  operator: string;
  operatorColor: string;
  action: string;
  details: string;
  severity?: 'info' | 'warning' | 'success';
}

const activityLogs: ActivityLogEntry[] = [
  {
    id: 'act1',
    timestamp: '09:12:22',
    operator: 'RedAlpha',
    operatorColor: 'text-cyan-400',
    action: 'Exploit',
    details: 'Launched Log4Shell against 192.168.1.20:8080 → session opened',
    severity: 'success',
  },
  {
    id: 'act2',
    timestamp: '09:14:05',
    operator: 'GhostHunter',
    operatorColor: 'text-purple-400',
    action: 'Recon',
    details: 'Added 47 subdomains to target list',
    severity: 'info',
  },
  {
    id: 'act3',
    timestamp: '09:15:30',
    operator: 'ShadowX',
    operatorColor: 'text-amber-400',
    action: 'SQLi',
    details: 'Confirmed union-based injection on /api/v1/login',
    severity: 'success',
  },
  {
    id: 'act4',
    timestamp: '09:18:44',
    operator: 'GhostHunter',
    operatorColor: 'text-purple-400',
    action: 'Git',
    details: 'Cloned exposed .git repo from git.target.corp',
    severity: 'warning',
  },
  {
    id: 'act5',
    timestamp: '09:22:10',
    operator: 'RedAlpha',
    operatorColor: 'text-cyan-400',
    action: 'Meterpreter',
    details: 'Loaded mimikatz, dumped hashes from LSASS',
    severity: 'success',
  },
  {
    id: 'act6',
    timestamp: '09:31:00',
    operator: 'RedAlpha',
    operatorColor: 'text-cyan-400',
    action: 'Exploit',
    details: 'MS17-010 on DC01 → SYSTEM shell obtained',
    severity: 'success',
  },
  {
    id: 'act7',
    timestamp: '09:33:22',
    operator: 'ShadowX',
    operatorColor: 'text-amber-400',
    action: 'Cracking',
    details: 'Cracked admin hash: P@ssw0rd!',
    severity: 'success',
  },
  {
    id: 'act8',
    timestamp: '09:40:11',
    operator: 'System',
    operatorColor: 'text-gray-400',
    action: 'Share',
    details: 'Session #2 shared with team',
    severity: 'info',
  },
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

function StatusDot({ status }: { status: Operator['status'] }) {
  const colors = { Online: 'bg-green-400', Away: 'bg-amber-400', Busy: 'bg-red-400' };
  return <div className={cn('w-2 h-2 rounded-full', colors[status])} />;
}

function OperatorCard({ op }: { op: Operator }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-[#1e2535] last:border-0">
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
          op.avatarBg,
          op.color,
        )}
      >
        {op.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[#c5cfe0]">{op.name}</span>
          <StatusDot status={op.status} />
          <span className="text-[9px] text-[#6b7a96]">{op.status}</span>
        </div>
        <div className="text-[9.5px] text-green-400">{op.currentActivity}</div>
        <div className="text-[9px] text-[#3d4a61]">Last seen: {op.lastSeen}</div>
      </div>
      <span className={cn('text-[9px] font-bold px-1.5 py-0 rounded', op.badgeColor)}>
        {op.role}
      </span>
    </div>
  );
}

// ============================================================================
// 3. TAB COMPONENTS
// ============================================================================

// ---- Operators Tab ----
function TabOperators() {
  return (
    <div className="flex-1 overflow-y-auto p-2 bg-[#141924]">
      {operators.map((op) => (
        <OperatorCard key={op.id} op={op} />
      ))}
      <div className="mt-4 pt-2 border-t border-[#1e2535]">
        <SectionTitle>Permissions Matrix</SectionTitle>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-2">
          <KVRow
            label="Lead"
            value="Full access: recon, exploit, post, reporting"
            valueColor="text-cyan-400"
          />
          <KVRow
            label="Member"
            value="Recon, SQLi, basic exploitation"
            valueColor="text-amber-400"
          />
          <KVRow
            label="Observer"
            value="Read-only: view findings, chat, reports"
            valueColor="text-green-400"
          />
        </div>
      </div>
    </div>
  );
}

// ---- Team Chat Tab ----
function TabTeamChat() {
  const [newMessage, setNewMessage] = useState('');
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#141924]">
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2 py-1.5 border-b border-[#1e2535]/40',
              msg.isHighlight && 'bg-green-500/4 rounded px-1',
            )}
          >
            {!msg.isSystem && (
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5',
                  msg.authorBg,
                  msg.authorColor,
                )}
              >
                {msg.authorInitials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                {!msg.isSystem && (
                  <span className={cn('text-[10.5px] font-bold', msg.authorColor)}>
                    {msg.authorName}
                  </span>
                )}
                <span className="text-[9px] text-[#3d4a61]">{msg.time}</span>
              </div>
              <div
                className={cn(
                  'text-[10.5px] leading-5',
                  msg.isSystem
                    ? 'text-[#6b7a96] italic'
                    : msg.isHighlight
                      ? 'text-green-400'
                      : 'text-[#c5cfe0]',
                )}
              >
                {msg.text}
              </div>
              {msg.attachments && (
                <div className="flex gap-2 mt-1">
                  {msg.attachments.map((att) => (
                    <span
                      key={att.name}
                      className="text-[9px] bg-[#0f1319] px-1.5 py-0.5 rounded text-cyan-400"
                    >
                      📎 {att.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-[#1e2535] bg-[#0f1319] shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Message team... (type / to use commands)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 h-8 bg-[#111520] border border-[#252e42] rounded text-[#c5cfe0] text-[11px] px-3 outline-none placeholder:text-[#3d4a61]"
          />
          <ToolbarButton variant="cyan">Send</ToolbarButton>
        </div>
        <div className="flex gap-3 mt-1 text-[9px] text-[#3d4a61]">
          <span>/share_session</span>
          <span>/share_file</span>
          <span>/status</span>
          <span>/kick</span>
        </div>
      </div>
    </div>
  );
}

// ---- Shared Workspace Tab (resources, sessions, files) ----
function TabSharedWorkspace() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Shared Sessions</SectionTitle>
          {sharedSessions.map((sess) => (
            <div key={sess.id} className="mb-2 pb-2 border-b border-[#1e2535] last:border-0">
              <div className="flex justify-between items-center">
                <span className="font-mono text-cyan-400 text-[11px]">{sess.target}</span>
                <Badge color={sess.type === 'meterpreter' ? 'green' : 'amber'}>{sess.type}</Badge>
              </div>
              <KVRow label="User" value={sess.user} />
              <KVRow label="Privileges" value={sess.privileges} />
              <KVRow label="Shared by" value={sess.sharedBy} valueColor="text-[#6b7a96]" />
              <KVRow label="Expires" value={sess.expiresAt} valueColor="text-amber-400" />
              <ActionButton size="sm" variant="cyan" className="mt-1">
                Connect
              </ActionButton>
            </div>
          ))}
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Shared Files</SectionTitle>
          {sharedFiles.map((file) => (
            <div key={file.id} className="mb-2 pb-2 border-b border-[#1e2535] last:border-0">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-mono text-cyan-400">{file.name}</span>
                <Badge color="gray">{file.size}</Badge>
              </div>
              <div className="flex justify-between text-[9px] text-[#6b7a96] mt-1">
                <span>
                  {file.type.toUpperCase()} · by {file.sharedBy}
                </span>
                <span>{file.downloadCount} downloads</span>
              </div>
              <ActionButton size="sm" className="mt-1">
                Download
              </ActionButton>
            </div>
          ))}
        </div>
        <div className="col-span-2 bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Collaboration Notes</SectionTitle>
          <textarea
            readOnly
            value="Meeting notes:\n- DC01 compromised, krbtgt hash obtained\n- SQLi yields admin access\n- Phishing campaign success rate 45%\n- Next step: lateral movement to file servers"
            className="w-full h-24 bg-[#0f1319] border border-[#252e42] rounded text-[10px] text-[#c5cfe0] p-2 resize-none"
          />
          <div className="flex justify-end mt-2 gap-2">
            <ActionButton size="sm">Save Note</ActionButton>
            <ActionButton size="sm" variant="cyan">
              Share Note
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Activity Log Tab ----
function TabActivityLog() {
  const [filter, setFilter] = useState('all');
  const filteredLogs =
    filter === 'all'
      ? activityLogs
      : activityLogs.filter(
          (l) =>
            l.operator.toLowerCase().includes(filter) || l.action.toLowerCase().includes(filter),
        );
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Filter by operator or action..."
          onChange={(e) => setFilter(e.target.value.toLowerCase())}
          className="flex-1 h-7 bg-[#111520] border border-[#252e42] rounded text-[10px] px-2 text-[#c5cfe0]"
        />
        <ToolbarButton size="sm">Export Log</ToolbarButton>
      </div>
      <div className="bg-[#111520] border border-[#1e2535] rounded">
        <table className="w-full text-[10px]">
          <thead className="border-b border-[#1e2535] bg-[#0f1319]">
            <tr>
              <th className="text-left p-2 text-[#3d4a61]">Time</th>
              <th className="text-left p-2 text-[#3d4a61]">Operator</th>
              <th className="text-left p-2 text-[#3d4a61]">Action</th>
              <th className="text-left p-2 text-[#3d4a61]">Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} className="border-b border-[#1e2535] hover:bg-[#0f1319]">
                <td className="p-2 text-[#6b7a96]">{log.timestamp}</td>
                <td className={cn('p-2 font-semibold', log.operatorColor)}>{log.operator}</td>
                <td className="p-2 text-cyan-400">{log.action}</td>
                <td className="p-2 text-[#c5cfe0]">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Session Sharing (optional sub-tab) but we already have it in Shared Workspace, so we can add a separate tab ----
function TabSessions() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-2">
        {sharedSessions.map((sess) => (
          <div key={sess.id} className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-mono text-cyan-400 text-[12px]">{sess.target}</span>
              <Badge color={sess.type === 'meterpreter' ? 'green' : 'amber'}>{sess.type}</Badge>
            </div>
            <KVRow label="User" value={sess.user} />
            <KVRow label="Privileges" value={sess.privileges} />
            <KVRow label="Shared by" value={sess.sharedBy} valueColor="text-[#6b7a96]" />
            <KVRow label="Expires" value={sess.expiresAt} valueColor="text-amber-400" />
            <div className="flex gap-2 mt-2">
              <ActionButton size="sm" variant="cyan">
                Takeover
              </ActionButton>
              <ActionButton size="sm">View Logs</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- File Share Tab ----
function TabFileShare() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="flex justify-between items-center mb-3">
        <SectionTitle>Team Files</SectionTitle>
        <ToolbarButton variant="cyan">Upload File</ToolbarButton>
      </div>
      <table className="w-full text-[11px]">
        <thead className="border-b border-[#1e2535] bg-[#0f1319]">
          <tr>
            <th className="text-left p-2 text-[#3d4a61]">Name</th>
            <th className="text-left p-2 text-[#3d4a61]">Size</th>
            <th className="text-left p-2 text-[#3d4a61]">Type</th>
            <th className="text-left p-2 text-[#3d4a61]">Shared by</th>
            <th className="text-left p-2 text-[#3d4a61]">Downloads</th>
            <th className="text-left p-2 text-[#3d4a61]"></th>
          </tr>
        </thead>
        <tbody>
          {sharedFiles.map((file) => (
            <tr key={file.id} className="border-b border-[#1e2535] hover:bg-[#111520]">
              <td className="p-2 font-mono text-cyan-400">{file.name}</td>
              <td className="p-2 text-[#6b7a96]">{file.size}</td>
              <td className="p-2">
                <Badge color="gray">{file.type}</Badge>
              </td>
              <td className="p-2">{file.sharedBy}</td>
              <td className="p-2">{file.downloadCount}</td>
              <td className="p-2">
                <ActionButton size="sm">Download</ActionButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 4. MAIN EXPORT
// ============================================================================

const TABS = [
  'Operators',
  'Team Chat',
  'Shared Workspace',
  'Sessions',
  'Files',
  'Activity Log',
] as const;

export function Collab() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Operators':
        return <TabOperators />;
      case 'Team Chat':
        return <TabTeamChat />;
      case 'Shared Workspace':
        return <TabSharedWorkspace />;
      case 'Sessions':
        return <TabSessions />;
      case 'Files':
        return <TabFileShare />;
      case 'Activity Log':
        return <TabActivityLog />;
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
        activeColor="text-blue-400 border-blue-400 bg-blue-500/5"
      />
      <Toolbar>
        <div className="flex items-center gap-1.5 text-[10px] text-green-400 shrink-0">
          <PulseIndicator /> {operators.filter((o) => o.status === 'Online').length} operators
          online
        </div>
        <TbSep />
        <ToolbarButton>Share Target</ToolbarButton>
        <ToolbarButton>Share Session</ToolbarButton>
        <ToolbarButton variant="purple">Shared Workspace</ToolbarButton>
        <ToolbarButton className="ml-auto">Activity Log</ToolbarButton>
      </Toolbar>
      {renderTabContent()}
    </div>
  );
}
