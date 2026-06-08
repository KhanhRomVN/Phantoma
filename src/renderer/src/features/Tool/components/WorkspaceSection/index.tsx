// src/renderer/src/features/Tool/components/WorkspaceSection/index.tsx
import { PhantomModule, SubTarget } from '../../types/types';
import { PulseIndicator } from '../../../../core/components/ui';
import { useLiveClock } from '../../hooks/useLiveClock';

import { Recon } from './Intel';
import { Dashboard } from './Dashboard';
import Scan from './Scan';

// ─── Module title map (local, lightweight) ───────────────────────────────────

const MODULE_TITLE: Record<string, string> = {
  dashboard: 'Dashboard',
  recon: 'Recon / OSINT',
  scanner: 'Network Scanner',
  vulns: 'Vulnerability Scanner',
  exploit: 'Exploit Engine',
  post: 'Post-Exploitation',
  intruder: 'Intruder / Fuzzer',
  webapp: 'Web App Scanner',
  sqli: 'SQLi / XSS / Injection',
  forensics: 'Forensics',
  malware: 'Malware Sandbox',
  sniffer: 'Network Sniffer',
  cracking: 'Hash / Password Cracking',
  phishing: 'Phishing / SE Toolkit',
  cloud: 'Cloud Security',
  report: 'Report Builder',
  collab: 'Collaboration',
  c2: 'C2 / Operations',
  settings: 'Settings',
  target: 'Target Manager',
};

// ─── StatusBar ───────────────────────────────────────────────────────────────

const SEP = () => <div className="w-px h-3 bg-[#1e2535] shrink-0" />;

function StatusBar({ module, subTarget }: { module: PhantomModule; subTarget: SubTarget }) {
  const now = useLiveClock();
  const title = MODULE_TITLE[module] ?? module;

  return (
    <div className="flex items-center gap-4 h-[22px] bg-[#0f1319] border-t border-[#1e2535] px-3 text-[9.5px] text-[#3d4a61] overflow-hidden shrink-0 select-none">
      <span>
        Module: <span className="text-[#6b7a96]">{title}</span>
      </span>
      <SEP />
      <span>
        Target: <span className="text-[#6b7a96]">{subTarget.name}</span>
      </span>
      <SEP />
      <span className="capitalize">
        Type: <span className="text-cyan-400/70">{subTarget.type}</span>
      </span>
      <SEP />
      <span>
        Sessions: <span className="text-green-400">3 active</span>
      </span>
      <SEP />
      <span>
        Vulns: <span className="text-red-400">27</span>
      </span>
      <SEP />
      <span>
        Creds: <span className="text-green-400">14 cracked</span>
      </span>
      <SEP />
      <span>
        Tunnel: <span className="text-green-400">TUN0 UP</span>
      </span>
      <span className="ml-auto text-[#6b7a96] font-mono">{now}</span>
    </div>
  );
}

// ─── WorkspaceTopbar ─────────────────────────────────────────────────────────

function WorkspaceTopbar({ module, subTarget }: { module: PhantomModule; subTarget: SubTarget }) {
  const title = MODULE_TITLE[module] ?? module;

  return (
    <div className="flex items-center gap-2.5 px-3.5 h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0">
      <span className="font-[Rajdhani,sans-serif] text-[13px] font-semibold text-[#6b7a96] tracking-wide">
        PHANTOM / <span className="text-[#c5cfe0]">{title}</span> /{' '}
        <span className="text-cyan-400">{subTarget.name}</span>
        <span className="text-[#3d4a61] ml-1 text-[11px]">({subTarget.address})</span>
      </span>
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-green-400">
          <PulseIndicator /> Session Active
        </div>
        <span className="text-[10px] text-[#6b7a96] px-1.5 py-0.5 border border-[#252e42] rounded">
          TUN0: 10.10.14.5
        </span>
        {subTarget.riskScore !== undefined && (
          <span
            className={`text-[10px] px-1.5 py-0.5 border rounded ${
              subTarget.riskScore >= 80
                ? 'text-red-400 border-red-500/30'
                : subTarget.riskScore >= 50
                  ? 'text-amber-400 border-amber-500/30'
                  : 'text-green-400 border-green-500/30'
            }`}
          >
            Risk {subTarget.riskScore}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── ViewRouter ──────────────────────────────────────────────────────────────

function ViewRouter({
  module,
  activeSubItem,
}: {
  module: PhantomModule;
  activeSubItem?: string | null;
}) {
  switch (module) {
    case 'dashboard':
      return <Dashboard />;
    case 'recon':
      return <Recon activeSubItem={activeSubItem} />;
    case 'scanner':
      return <Scan activeSubItem={activeSubItem} />;
    default:
      return <Dashboard />;
  }
}

// ─── Workspace (main export) ─────────────────────────────────────────────────

export function Workspace({
  module,
  subTarget,
  activeSubItem,
}: {
  module: PhantomModule;
  subTarget: SubTarget;
  activeSubItem?: string | null;
}) {
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <WorkspaceTopbar module={module} subTarget={subTarget} />
      <div className="flex-1 overflow-hidden flex flex-col bg-[#0f1319]">
        <ViewRouter module={module} activeSubItem={activeSubItem} />
      </div>
      <StatusBar module={module} subTarget={subTarget} />
    </div>
  );
}
