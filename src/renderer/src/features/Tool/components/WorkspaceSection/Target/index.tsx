// src/renderer/src/features/Tool/components/WorkspaceSection/Target/index.tsx
import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import type { PhantomTarget, SubTarget } from '../../../types/types';
import { Plus, Crosshair, Globe, Server, Smartphone, Zap, Link2, Network, Radio, ChevronRight, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, React.ReactNode> = {
  website: <Globe className="w-3.5 h-3.5" />,
  server:  <Server className="w-3.5 h-3.5" />,
  app:     <Smartphone className="w-3.5 h-3.5" />,
  api:     <Zap className="w-3.5 h-3.5" />,
  domain:  <Link2 className="w-3.5 h-3.5" />,
  network: <Network className="w-3.5 h-3.5" />,
  device:  <Radio className="w-3.5 h-3.5" />,
};

const RISK_COLOR = (score?: number) => {
  if (!score) return 'text-[#6b7a96]';
  if (score >= 80) return 'text-red-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-green-400';
};

const RISK_BG = (score?: number) => {
  if (!score) return 'border-[#1e2535]';
  if (score >= 80) return 'border-red-500/30 bg-red-500/5';
  if (score >= 50) return 'border-amber-500/30 bg-amber-500/5';
  return 'border-green-500/30 bg-green-500/5';
};

const STATUS_DOT: Record<string, string> = {
  active:   'bg-cyan-400',
  scanning: 'bg-amber-400 animate-pulse',
  done:     'bg-green-400',
  idle:     'bg-[#3d4a61]',
  offline:  'bg-red-400',
};

const GROUP_STATUS_DOT: Record<string, string> = {
  active: 'bg-green-400',
  paused: 'bg-amber-400',
  done:   'bg-[#3d4a61]',
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TARGETS: PhantomTarget[] = [
  {
    id: 'tg-1',
    name: 'Corp Internal Pentest Q3',
    description: 'Internal network assessment for Q3 2024',
    createdAt: '2024-07-01',
    status: 'active',
    subTargets: [
      { id: 'st-1', name: 'corp.internal.local', type: 'domain', address: '10.0.0.1', status: 'active', riskScore: 87, tags: ['AD', 'critical'] },
      { id: 'st-2', name: 'web-01.corp', type: 'website', address: '10.0.0.10', status: 'scanning', riskScore: 62, tags: ['web', 'nginx'] },
      { id: 'st-3', name: 'db-01.corp', type: 'server', address: '10.0.0.20', status: 'done', riskScore: 91, tags: ['mysql', 'db'] },
    ],
  },
  {
    id: 'tg-2',
    name: 'External Recon — Target Alpha',
    description: 'Bug bounty scope for Target Alpha',
    createdAt: '2024-08-15',
    status: 'paused',
    subTargets: [
      { id: 'st-4', name: 'alpha.example.com', type: 'website', address: 'alpha.example.com', status: 'idle', riskScore: 45, tags: ['public'] },
      { id: 'st-5', name: 'api.alpha.example.com', type: 'api', address: 'api.alpha.example.com', status: 'idle', riskScore: 38 },
    ],
  },
];

// ─── SubTargetRow ──────────────────────────────────────────────────────────────

function SubTargetRow({
  st,
  isActive,
  onClick,
}: {
  st: SubTarget;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded border transition-all text-left',
        isActive
          ? 'bg-cyan-500/8 border-cyan-500/20 text-cyan-400'
          : 'border-transparent text-[#c5cfe0] hover:bg-[#161b26] hover:border-[#1e2535]',
      )}
    >
      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[st.status])} />
      <span className="text-[#6b7a96] shrink-0">{TYPE_ICON[st.type]}</span>
      <span className="text-[11.5px] flex-1 truncate font-medium">{st.name}</span>
      <span className="text-[10px] font-mono text-[#3d4a61] truncate max-w-[100px]">{st.address}</span>
      {st.riskScore !== undefined && (
        <span className={cn('text-[10px] font-bold shrink-0', RISK_COLOR(st.riskScore))}>
          {st.riskScore}
        </span>
      )}
    </button>
  );
}

// ─── TargetGroupCard ──────────────────────────────────────────────────────────

function TargetGroupCard({
  group,
  activeSubTargetId,
  onSelectSubTarget,
}: {
  group: PhantomTarget;
  activeSubTargetId: string;
  onSelectSubTarget: (stId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-[#1e2535] overflow-hidden mb-3">
      {/* group header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#0f1319] border-b border-[#1e2535]">
        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', GROUP_STATUS_DOT[group.status])} />
        <span className="text-[12px] font-semibold text-[#c5cfe0] flex-1 truncate">{group.name}</span>
        <span className="text-[9px] text-[#3d4a61] shrink-0">{group.subTargets.length} targets</span>
        <span className={cn(
          'text-[9px] px-1.5 py-0.5 rounded border capitalize shrink-0',
          group.status === 'active'
            ? 'text-green-400 border-green-500/30'
            : group.status === 'paused'
            ? 'text-amber-400 border-amber-500/30'
            : 'text-[#6b7a96] border-[#1e2535]',
        )}>
          {group.status}
        </span>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[#3d4a61] hover:text-[#c5cfe0] transition-colors shrink-0"
        >
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-90')} />
        </button>
        <button className="text-[#3d4a61] hover:text-[#c5cfe0] transition-colors shrink-0">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* sub-targets */}
      {expanded && (
        <div className="p-1.5 space-y-0.5">
          {group.subTargets.map(st => (
            <SubTargetRow
              key={st.id}
              st={st}
              isActive={st.id === activeSubTargetId}
              onClick={() => onSelectSubTarget(st.id)}
            />
          ))}
          <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-[10.5px] text-[#3d4a61] hover:text-cyan-400 hover:bg-[#161b26] transition-all">
            <Plus className="w-3 h-3" /> Add sub-target
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SubTargetDetail ──────────────────────────────────────────────────────────

function SubTargetDetail({ st }: { st: SubTarget | null }) {
  if (!st) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#3d4a61]">
        <Crosshair className="w-10 h-10 opacity-30" />
        <span className="text-[12px]">Select a target to view details</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#252e42]">
      {/* header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400">
          {TYPE_ICON[st.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-[#c5cfe0] truncate">{st.name}</div>
          <div className="text-[11px] font-mono text-[#6b7a96] mt-0.5">{st.address}</div>
        </div>
        <div className="flex gap-1.5">
          <button className="p-1.5 rounded border border-[#1e2535] text-[#6b7a96] hover:text-[#c5cfe0] hover:border-[#252e42] transition-all">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded border border-[#1e2535] text-[#6b7a96] hover:text-red-400 hover:border-red-500/30 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* stat row */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className={cn('rounded-lg border p-2.5', RISK_BG(st.riskScore))}>
          <div className="text-[9px] text-[#3d4a61] uppercase tracking-widest mb-1">Risk Score</div>
          <div className={cn('text-[18px] font-bold', RISK_COLOR(st.riskScore))}>
            {st.riskScore ?? '—'}
          </div>
        </div>
        <div className="rounded-lg border border-[#1e2535] p-2.5">
          <div className="text-[9px] text-[#3d4a61] uppercase tracking-widest mb-1">Status</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[st.status])} />
            <span className="text-[11px] capitalize text-[#c5cfe0]">{st.status}</span>
          </div>
        </div>
        <div className="rounded-lg border border-[#1e2535] p-2.5">
          <div className="text-[9px] text-[#3d4a61] uppercase tracking-widest mb-1">Type</div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[#6b7a96]">
            {TYPE_ICON[st.type]}
            <span className="text-[11px] capitalize text-[#c5cfe0]">{st.type}</span>
          </div>
        </div>
      </div>

      {/* tags */}
      {st.tags && st.tags.length > 0 && (
        <div className="mb-5">
          <div className="text-[9px] text-[#3d4a61] uppercase tracking-widest mb-2">Tags</div>
          <div className="flex flex-wrap gap-1.5">
            {st.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded border border-[#252e42] text-[10px] text-[#6b7a96] bg-[#161b26]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* address details */}
      <div className="mb-5">
        <div className="text-[9px] text-[#3d4a61] uppercase tracking-widest mb-2">Address</div>
        <div className="rounded-lg border border-[#1e2535] bg-[#0d1117] px-3 py-2 font-mono text-[11px] text-cyan-400">
          {st.address}
        </div>
      </div>

      {/* placeholder sections */}
      {(['Open Ports', 'Vulnerabilities', 'Credentials', 'Notes'] as const).map(section => (
        <div key={section} className="mb-3">
          <div className="text-[9px] text-[#3d4a61] uppercase tracking-widest mb-2">{section}</div>
          <div className="rounded-lg border border-dashed border-[#1e2535] px-3 py-3 text-[10.5px] text-[#3d4a61] text-center">
            No data yet
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── TargetManager (main export) ──────────────────────────────────────────────

export function TargetManager() {
  const [targets] = useState<PhantomTarget[]>(MOCK_TARGETS);
  const [activeSubTargetId, setActiveSubTargetId] = useState<string>(MOCK_TARGETS[0].subTargets[0].id);

  const allSubTargets = targets.flatMap(t => t.subTargets);
  const activeSubTarget = allSubTargets.find(st => st.id === activeSubTargetId) ?? null;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* left panel — target list */}
      <div className="w-[280px] shrink-0 border-r border-[#1e2535] flex flex-col overflow-hidden">
        {/* list header */}
        <div className="flex items-center gap-2 px-3 h-[38px] border-b border-[#1e2535] shrink-0">
          <span className="text-[11px] font-semibold text-[#6b7a96] tracking-wider uppercase flex-1">
            Target Groups
          </span>
          <button className="flex items-center gap-1 text-[10px] text-[#3d4a61] hover:text-cyan-400 transition-colors px-1.5 py-0.5 rounded hover:bg-cyan-500/5">
            <Plus className="w-3 h-3" /> New Group
          </button>
        </div>

        {/* list body */}
        <div className="flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#252e42]">
          {targets.map(group => (
            <TargetGroupCard
              key={group.id}
              group={group}
              activeSubTargetId={activeSubTargetId}
              onSelectSubTarget={setActiveSubTargetId}
            />
          ))}
        </div>
      </div>

      {/* right panel — detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* detail header */}
        <div className="flex items-center gap-2 px-3 h-[38px] border-b border-[#1e2535] shrink-0">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-[11px] font-semibold text-[#6b7a96] tracking-wider uppercase flex-1">
            {activeSubTarget ? activeSubTarget.name : 'Target Detail'}
          </span>
        </div>

        <SubTargetDetail st={activeSubTarget} />
      </div>
    </div>
  );
}
