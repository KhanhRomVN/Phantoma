// C2 / Ops module — Sessions, Arsenal, Vault
import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import { Badge, SectionLabel, ToolbarButton } from '../../../../../core/components/ui';
import { mockWordlists, mockCVEs } from '../../../data/mockData';

// ─── shared tiny helpers ─────────────────────────────────────────────────────

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
    {children}
  </div>
);

const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />;

// ─── Sessions ────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  ip: string;
  type: 'meterpreter' | 'shell' | 'ssh';
  typeColor: 'green' | 'cyan' | 'amber';
  user: string;
  os: string;
  uptime: string;
  isActive: boolean;
  targetGroup: string;
}

const SESSIONS: Session[] = [
  {
    id: '#1',
    ip: '192.168.1.10',
    type: 'meterpreter',
    typeColor: 'green',
    user: 'NT AUTHORITY\\SYSTEM',
    os: 'Windows Server 2019',
    uptime: '00:23:41',
    isActive: true,
    targetGroup: 'Corp Internal',
  },
  {
    id: '#2',
    ip: '192.168.1.20',
    type: 'shell',
    typeColor: 'cyan',
    user: 'www-data',
    os: 'Linux/Ubuntu 20.04',
    uptime: '00:11:08',
    isActive: false,
    targetGroup: 'Corp Internal',
  },
  {
    id: '#3',
    ip: '10.0.0.50',
    type: 'ssh',
    typeColor: 'amber',
    user: 'root',
    os: 'Debian 11',
    uptime: '00:04:22',
    isActive: false,
    targetGroup: 'External Surface',
  },
];

const TYPE_STYLE: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border border-green-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

function SessionsView() {
  return (
    <div className="flex-1 overflow-y-auto p-[10px] bg-[#080a0e] space-y-2">
      {SESSIONS.map((s) => (
        <div
          key={s.id}
          className={cn(
            'rounded-md border px-3 py-2.5 cursor-pointer transition-all',
            s.isActive
              ? 'bg-green-500/4 border-green-500/25'
              : 'bg-[#111520] border-[#1e2535] hover:border-[#252e42]',
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                s.typeColor === 'green'
                  ? 'bg-green-400'
                  : s.typeColor === 'cyan'
                    ? 'bg-cyan-400'
                    : 'bg-amber-400',
                s.isActive && 'animate-pulse',
              )}
            />
            <span className="text-[10px] text-[#3d4a61]">{s.id}</span>
            <span
              className={cn(
                'text-[12px] font-bold',
                s.isActive ? 'text-green-400' : 'text-[#c5cfe0]',
              )}
            >
              {s.ip}
            </span>
            <span
              className={cn('ml-auto text-[9.5px] px-1.5 py-0.5 rounded', TYPE_STYLE[s.typeColor])}
            >
              {s.type}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            {(
              [
                ['User', s.user],
                ['OS', s.os],
                ['Uptime', s.uptime],
                ['Scope', s.targetGroup],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex gap-1.5 text-[10.5px] py-0.5">
                <span className="text-[#6b7a96] w-12 shrink-0">{k}</span>
                <span
                  className={
                    k === 'Uptime'
                      ? 'text-green-400'
                      : k === 'User' && s.isActive
                        ? 'text-cyan-400'
                        : 'text-[#c5cfe0]'
                  }
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button className="text-[9.5px] px-2 py-0.5 rounded border border-[#1e2535] text-[#6b7a96] hover:border-cyan-500/40 hover:text-cyan-400 transition-all">
              Interact
            </button>
            <button className="text-[9.5px] px-2 py-0.5 rounded border border-[#1e2535] text-[#6b7a96] hover:border-green-500/40 hover:text-green-400 transition-all">
              Upgrade
            </button>
            <button className="text-[9.5px] px-2 py-0.5 rounded border border-[#1e2535] text-[#6b7a96] hover:border-red-500/40 hover:text-red-400 transition-all ml-auto">
              Kill
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Arsenal ─────────────────────────────────────────────────────────────────

function ArsenalView() {
  return (
    <div className="flex-1 overflow-y-auto p-[10px] bg-[#080a0e]">
      <SectionLabel>Wordlists</SectionLabel>
      <div className="space-y-1 mb-3">
        {mockWordlists.map((w) => (
          <div
            key={w.id}
            className="flex items-center gap-2 px-2 py-[5px] rounded border border-transparent hover:bg-[#161b26] hover:border-[#1e2535] cursor-pointer transition-all"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              className="w-3.5 h-3.5 text-[#6b7a96] shrink-0"
            >
              <path d="M3 2h10l1 3H2z" />
              <path d="M2 5h12v9H2z" />
              <path d="M5 8h6M5 11h4" />
            </svg>
            <span className="flex-1 text-[11px] text-[#c5cfe0] truncate">{w.label}</span>
            <Badge color={w.badgeColor}>{w.badge}</Badge>
          </div>
        ))}
      </div>

      <SectionLabel>CVE Database</SectionLabel>
      <div className="space-y-1 mb-3">
        {mockCVEs.map((cve) => (
          <div
            key={cve.id}
            className="flex items-center gap-2 px-2 py-[5px] rounded border border-transparent hover:bg-[#161b26] hover:border-[#1e2535] cursor-pointer transition-all"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              className={cn(
                'w-3.5 h-3.5 shrink-0',
                cve.badgeColor === 'red'
                  ? 'text-red-400'
                  : cve.badgeColor === 'purple'
                    ? 'text-purple-400'
                    : 'text-amber-400',
              )}
            >
              <path d="M8 1l6 3v4c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V4z" />
            </svg>
            <span className="flex-1 text-[11px] text-[#c5cfe0] truncate">{cve.label}</span>
            <Badge color={cve.badgeColor}>{cve.badge}</Badge>
          </div>
        ))}
      </div>

      <SectionLabel>Upload Custom Payload</SectionLabel>
      <button className="w-full mt-1 px-2.5 py-1.5 rounded border border-dashed border-[#252e42] text-[10.5px] text-[#3d4a61] hover:border-cyan-500/40 hover:text-cyan-400 transition-all">
        + Drop file or click to upload
      </button>
    </div>
  );
}

// ─── Vault ───────────────────────────────────────────────────────────────────

type SourceTag = 'hashdump' | 'phishing' | 'sqli' | 'brute';
type CredStatus = 'valid' | 'unknown';

interface CredEntry {
  id: string;
  label: string;
  detail: string;
  source: SourceTag;
  status: CredStatus;
  targetGroup: string;
}

const CREDS: CredEntry[] = [
  {
    id: '1',
    label: 'SYSTEM — Administrator',
    detail: 'aad3b435...d7b5e5f4',
    source: 'hashdump',
    status: 'valid',
    targetGroup: 'Corp Internal',
  },
  {
    id: '2',
    label: 'alice@corp.local',
    detail: 'Spring2024!',
    source: 'phishing',
    status: 'valid',
    targetGroup: 'Corp Internal',
  },
  {
    id: '3',
    label: 'admin',
    detail: 'admin123',
    source: 'brute',
    status: 'valid',
    targetGroup: 'Corp Internal',
  },
  {
    id: '4',
    label: 'john.doe@corp.local',
    detail: '$2y$10$xyz789...',
    source: 'sqli',
    status: 'valid',
    targetGroup: 'External Surface',
  },
  {
    id: '5',
    label: 'ceo@corp.local',
    detail: 'Secr3t!Pass',
    source: 'phishing',
    status: 'valid',
    targetGroup: 'External Surface',
  },
  {
    id: '6',
    label: 'SYSTEM — krbtgt',
    detail: 'TGT ticket (kerberos)',
    source: 'hashdump',
    status: 'unknown',
    targetGroup: 'Corp Internal',
  },
];

const SOURCE_CLS: Record<SourceTag, string> = {
  hashdump: 'bg-red-500/12 text-red-400 border border-red-500/20',
  phishing: 'bg-amber-500/12 text-amber-400 border border-amber-500/20',
  sqli: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  brute: 'bg-green-500/10 text-green-400 border border-green-500/20',
};

function VaultView() {
  return (
    <div className="flex-1 overflow-y-auto p-[10px] bg-[#080a0e]">
      <SectionLabel>Credential Vault</SectionLabel>
      <div className="space-y-1">
        {CREDS.map((c) => (
          <div
            key={c.id}
            className={cn(
              'flex items-center gap-2 bg-[#111520] border border-[#1e2535] rounded px-2.5 py-1.5',
              c.status === 'valid'
                ? 'border-l-[3px] border-l-green-500'
                : 'border-l-[3px] border-l-amber-500',
            )}
          >
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'text-[11px] font-semibold truncate',
                  c.status === 'valid' ? 'text-green-400' : 'text-amber-400',
                )}
              >
                {c.label}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-[#6b7a96] truncate font-mono">{c.detail}</span>
                <span className="text-[8.5px] text-[#3d4a61] shrink-0">{c.targetGroup}</span>
              </div>
            </div>
            <span
              className={cn(
                'text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0',
                SOURCE_CLS[c.source],
              )}
            >
              {c.source}
            </span>
          </div>
        ))}
      </div>
      <button className="w-full mt-3 px-2.5 py-1.5 rounded border border-[#252e42] bg-[#161b26] text-[10.5px] font-semibold text-[#c5cfe0] flex items-center gap-1.5 hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all">
        <span className="opacity-40 text-xs">›</span> Export All Credentials
      </button>
    </div>
  );
}

// ─── ViewC2 (main export) ────────────────────────────────────────────────────

type C2Tab = 'sessions' | 'arsenal' | 'vault';

const C2_TABS: { id: C2Tab; label: string }[] = [
  { id: 'sessions', label: 'Sessions' },
  { id: 'arsenal', label: 'Arsenal' },
  { id: 'vault', label: 'Vault' },
];

export function C2() {
  const [tab, setTab] = useState<C2Tab>('sessions');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Toolbar>
        {C2_TABS.map((t, i) => (
          <>
            {i > 0 && <TbSep key={`sep-${t.id}`} />}
            <ToolbarButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </ToolbarButton>
          </>
        ))}
        <TbSep />
        <span className="text-[9.5px] text-[#3d4a61] ml-auto">
          {tab === 'sessions'
            ? `${SESSIONS.filter((s) => s.isActive).length} active`
            : tab === 'vault'
              ? `${CREDS.length} creds`
              : `${mockWordlists.length + mockCVEs.length} items`}
        </span>
      </Toolbar>

      {tab === 'sessions' && <SessionsView />}
      {tab === 'arsenal' && <ArsenalView />}
      {tab === 'vault' && <VaultView />}
    </div>
  );
}
