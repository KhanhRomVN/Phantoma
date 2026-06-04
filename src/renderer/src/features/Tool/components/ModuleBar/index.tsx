import { cn } from '../../../../shared/lib/utils';
import { NavModuleConfig, PhantomModule } from '../../types/types';
import { useState as _useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PhantomTarget, SubTarget } from '../../types/types';

const NAV_MODULES: NavModuleConfig[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    activeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  {
    id: 'recon',
    title: 'Reconnaissance',
    activeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  {
    id: 'scanner',
    title: 'Port Scanner',
    activeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  {
    id: 'vulns',
    title: 'Vulnerabilities',
    activeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  { id: 'exploit', title: 'Exploit', activeClass: 'bg-red-500/10 text-red-400 border-red-500/30' },
  {
    id: 'post',
    title: 'Post Exploitation',
    activeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  },
  {
    id: 'intruder',
    title: 'Intruder',
    activeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  {
    id: 'webapp',
    title: 'Web App',
    activeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  {
    id: 'sqli',
    title: 'SQL Injection',
    activeClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  },
  {
    id: 'forensics',
    title: 'Forensics',
    activeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  },
  {
    id: 'malware',
    title: 'Malware Analysis',
    activeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  {
    id: 'sniffer',
    title: 'Sniffer',
    activeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  {
    id: 'cracking',
    title: 'Password Cracking',
    activeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  },
  {
    id: 'phishing',
    title: 'Phishing',
    activeClass: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  },
  {
    id: 'cloud',
    title: 'Cloud Security',
    activeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
  {
    id: 'report',
    title: 'Report',
    activeClass: 'bg-green-500/10 text-green-400 border-green-500/30',
  },
  {
    id: 'collab',
    title: 'Collaboration',
    activeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  { id: 'c2', title: 'C2 / Ops', activeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
];

// ─── NavLogo ─────────────────────────────────────────────────────────────────

function NavLogo() {
  return (
    <div
      className="w-9 h-9 rounded-lg border border-[#0099cc] bg-cyan-500/5 flex items-center justify-center mb-2 cursor-pointer shrink-0"
      title="PHANTOM v2.5.0"
    >
      <svg
        className="w-[18px] h-[18px] text-cyan-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 2L3 7v10l9 5 9-5V7z" />
        <path d="M12 12L3 7M12 12v10M12 12l9-5" />
      </svg>
    </div>
  );
}

// ─── Tooltip Portal ──────────────────────────────────────────────────────────

function TooltipPortal({
  anchorRef,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const [pos, setPos] = _useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    });
  }, [anchorRef]);

  if (!pos) return null;

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none flex items-center gap-0"
      style={{ top: pos.top, left: pos.left, transform: 'translateY(-50%)' }}
    >
      {/* arrow */}
      <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-[#252e42]" />
      <div className="bg-[#0d1117] border border-[#252e42] rounded-md px-2.5 py-1.5 shadow-xl shadow-black/60 whitespace-nowrap">
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ─── NavIcon ─────────────────────────────────────────────────────────────────

function NavIcon({ module }: { module: PhantomModule }) {
  const p = {
    className: 'w-4 h-4',
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.3',
  } as const;
  switch (module) {
    case 'dashboard':
      return (
        <svg {...p}>
          <rect x="1" y="1" width="6" height="6" rx="1" />
          <rect x="9" y="1" width="6" height="6" rx="1" />
          <rect x="1" y="9" width="6" height="6" rx="1" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
      );
    case 'recon':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="5" />
          <path d="M8 3v1M8 12v1M3 8h1M12 8h1" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'scanner':
      return (
        <svg {...p}>
          <path d="M1 8a7 7 0 0 0 14 0" />
          <path d="M4 5a4.5 4.5 0 0 1 8 0" />
          <path d="M6 7a2 2 0 0 1 4 0" />
          <path d="M8 8v5" />
        </svg>
      );
    case 'vulns':
      return (
        <svg {...p}>
          <path d="M8 1l6 3v4c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V4z" />
          <path d="M5.5 8l2 2 3-3" />
        </svg>
      );
    case 'exploit':
      return (
        <svg {...p}>
          <path d="M8 2l1.5 3h3l-2.5 2 1 3L8 8.5 5 10l1-3-2.5-2h3z" />
        </svg>
      );
    case 'post':
      return (
        <svg {...p}>
          <rect x="2" y="4" width="12" height="9" rx="1.5" />
          <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M8 9v-2M7 9h2" />
        </svg>
      );
    case 'intruder':
      return (
        <svg {...p}>
          <path d="M2 4h12M2 8h8M2 12h5" />
          <path d="M13 10l2 2-2 2" />
        </svg>
      );
    case 'webapp':
      return (
        <svg {...p}>
          <rect x="1" y="3" width="14" height="10" rx="2" />
          <path d="M1 6h14M5 6v7" />
        </svg>
      );
    case 'sqli':
      return (
        <svg {...p}>
          <path d="M3 4l2 4-2 4" />
          <path d="M7 12h6" />
          <circle cx="13" cy="4" r="1.5" fill="currentColor" opacity=".5" />
        </svg>
      );
    case 'forensics':
      return (
        <svg {...p}>
          <path d="M4 2h8l2 3v9H2V2z" />
          <path d="M4 7h8M4 10h5" />
        </svg>
      );
    case 'malware':
      return (
        <svg {...p}>
          <path d="M8 2c-3 0-5 2-5 5s2 5 5 5 5-2 5-5-2-5-5-5z" />
          <path d="M8 5v3l2 1" />
        </svg>
      );
    case 'sniffer':
      return (
        <svg {...p}>
          <path d="M2 8h12" />
          <path d="M5 5l-3 3 3 3" />
          <path d="M11 5l3 3-3 3" />
        </svg>
      );
    case 'cracking':
      return (
        <svg {...p}>
          <rect x="2" y="6" width="12" height="8" rx="1.5" />
          <path d="M5 6V4a3 3 0 0 1 6 0v2M8 10v2" />
        </svg>
      );
    case 'phishing':
      return (
        <svg {...p}>
          <path d="M2 4l6 5 6-5" />
          <rect x="1" y="3" width="14" height="10" rx="1.5" />
        </svg>
      );
    case 'cloud':
      return (
        <svg {...p}>
          <path d="M4 10a3 3 0 1 1 0-6 4 4 0 1 1 8 0 3 3 0 0 1 0 6" />
        </svg>
      );
    case 'report':
      return (
        <svg {...p}>
          <path d="M3 2h10l1 3H2z" />
          <path d="M2 5h12v9H2z" />
          <path d="M5 9h6M5 12h4" />
        </svg>
      );
    case 'collab':
      return (
        <svg {...p}>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="11" cy="6" r="2.5" />
          <path d="M1 13c0-2.5 2-4 5-4M10 9c3 0 5 1.5 5 4" />
        </svg>
      );
    case 'c2':
      return (
        <svg {...p}>
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
          <path d="M11.5 9v3m0 0l-2-1.5m2 1.5l2-1.5" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="2" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" />
        </svg>
      );
    default:
      return null;
  }
}

// ─── NavButton ───────────────────────────────────────────────────────────────

function NavButton({
  module,
  title,
  isActive,
  activeClass,
  dotColor,
  onClick,
}: {
  module: PhantomModule;
  title: string;
  isActive: boolean;
  activeClass: string;
  dotColor?: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = _useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={ref}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'relative w-9 h-9 rounded-lg border flex items-center justify-center transition-all shrink-0',
          isActive
            ? activeClass
            : 'border-transparent text-[#6b7a96] hover:text-[#c5cfe0] hover:bg-[#161b26] hover:border-[#1e2535]',
        )}
      >
        <NavIcon module={module} />
        {dotColor && !isActive && (
          <span
            className={cn(
              'absolute top-1 right-1 w-1.5 h-1.5 rounded-full border border-[#0f1319]',
              dotColor,
            )}
          />
        )}
      </button>

      {hovered && (
        <TooltipPortal anchorRef={ref}>
          <span className="text-[11px] font-medium text-[#c5cfe0] font-[Rajdhani,sans-serif] tracking-wide">
            {title}
          </span>
        </TooltipPortal>
      )}
    </>
  );
}

// ─── TargetSwitcher overlay ──────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  website: '🌐',
  server: '🖥',
  app: '📱',
  api: '⚡',
  domain: '🔗',
  network: '🔀',
  device: '📡',
};

const RISK_COLOR = (score?: number) => {
  if (!score) return 'text-[#6b7a96]';
  if (score >= 80) return 'text-red-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-green-400';
};

const STATUS_DOT: Record<string, string> = {
  active: 'bg-cyan-400',
  scanning: 'bg-amber-400 animate-pulse',
  done: 'bg-green-400',
  idle: 'bg-[#3d4a61]',
  offline: 'bg-red-400',
};

function TargetSwitcherPanel({
  targets,
  activeTarget,
  activeSubTarget,
  onSwitchTarget,
  onSwitchSubTarget,
  onClose,
}: {
  targets: PhantomTarget[];
  activeTarget: PhantomTarget;
  activeSubTarget: SubTarget;
  onSwitchTarget: (id: string) => void;
  onSwitchSubTarget: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-[52px] top-0 z-50 w-[320px] h-full bg-[#0d1117] border-r border-[#252e42] flex flex-col shadow-xl shadow-black/50 overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-2 px-3 h-[52px] bg-[#0f1319] border-b border-[#252e42] shrink-0">
        <svg
          className="w-4 h-4 text-cyan-400 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <circle cx="8" cy="8" r="5" />
          <path d="M8 3v1M8 12v1M3 8h1M12 8h1" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </svg>
        <span className="font-[Rajdhani,sans-serif] text-[13px] font-bold tracking-wider text-[#c5cfe0] uppercase flex-1">
          Target Switcher
        </span>
        <button
          onClick={onClose}
          className="text-[#3d4a61] hover:text-[#c5cfe0] transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* target group list */}
      <div className="flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#252e42]">
        {targets.map((tg) => (
          <div key={tg.id} className="mb-3">
            {/* group header */}
            <button
              onClick={() => onSwitchTarget(tg.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-2 rounded-md border transition-all text-left',
                tg.id === activeTarget.id
                  ? 'bg-cyan-500/8 border-cyan-500/25 text-cyan-400'
                  : 'border-transparent text-[#c5cfe0] hover:bg-[#161b26] hover:border-[#1e2535]',
              )}
            >
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  tg.status === 'active'
                    ? 'bg-green-400'
                    : tg.status === 'paused'
                      ? 'bg-amber-400'
                      : 'bg-[#3d4a61]',
                )}
              />
              <span className="text-[11px] font-semibold flex-1">{tg.name}</span>
              <span className="text-[9px] text-[#3d4a61]">{tg.subTargets.length} targets</span>
            </button>

            {/* sub-targets — only show for active group */}
            {tg.id === activeTarget.id && (
              <div className="ml-3 mt-1 space-y-0.5 border-l border-[#1e2535] pl-2">
                {tg.subTargets.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => onSwitchSubTarget(st.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-[5px] rounded border transition-all text-left',
                      st.id === activeSubTarget.id
                        ? 'bg-cyan-500/8 border-cyan-500/20 text-cyan-400'
                        : 'border-transparent text-[#c5cfe0] hover:bg-[#161b26] hover:border-[#1e2535]',
                    )}
                  >
                    <div
                      className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[st.status])}
                    />
                    <span className="text-[9.5px] shrink-0 opacity-60">{TYPE_ICON[st.type]}</span>
                    <span className="text-[11px] flex-1 truncate">{st.name}</span>
                    {st.riskScore !== undefined && (
                      <span className={cn('text-[9px] font-bold', RISK_COLOR(st.riskScore))}>
                        {st.riskScore}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* add new target */}
        <button className="w-full mt-1 px-2.5 py-2 rounded border border-dashed border-[#252e42] text-[10.5px] text-[#3d4a61] hover:border-cyan-500/40 hover:text-cyan-400 transition-all flex items-center justify-center gap-1.5">
          <span>+</span> New Target Group
        </button>
      </div>

      {/* active sub-target summary */}
      <div className="px-3 py-2 border-t border-[#252e42] bg-[#0f1319] shrink-0">
        <div className="text-[9px] text-[#3d4a61] uppercase tracking-widest mb-1">Active</div>
        <div className="flex items-center gap-2">
          <span className="text-[9.5px]">{TYPE_ICON[activeSubTarget.type]}</span>
          <span className="text-[11px] font-semibold text-cyan-400 truncate">
            {activeSubTarget.name}
          </span>
          <span
            className={cn('ml-auto text-[9px] font-bold', RISK_COLOR(activeSubTarget.riskScore))}
          >
            {activeSubTarget.riskScore !== undefined ? `Risk ${activeSubTarget.riskScore}` : ''}
          </span>
        </div>
        <div className="text-[10px] text-[#6b7a96] font-mono mt-0.5 truncate">
          {activeSubTarget.address}
        </div>
      </div>
    </div>
  );
}

// ─── DashboardButton ─────────────────────────────────────────────────────────

function DashboardButton({
  isOpen,
  activeTarget,
  onClick,
}: {
  isOpen: boolean;
  activeTarget: PhantomTarget;
  onClick: () => void;
}) {
  const [hovered, setHovered] = _useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={ref}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'relative w-9 h-9 rounded-lg border flex items-center justify-center transition-all shrink-0',
          isOpen
            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
            : 'border-transparent text-[#6b7a96] hover:text-[#c5cfe0] hover:bg-[#161b26] hover:border-[#1e2535]',
        )}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        >
          <circle cx="8" cy="8" r="5" />
          <path d="M8 3v1M8 12v1M3 8h1M12 8h1" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </svg>
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 border border-[#0f1319]" />
      </button>

      {hovered && (
        <TooltipPortal anchorRef={ref}>
          <div className="text-[11px] font-medium text-[#c5cfe0] font-[Rajdhani,sans-serif] tracking-wide">
            Target Switcher
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5 max-w-[160px] truncate">
            {activeTarget.name}
          </div>
        </TooltipPortal>
      )}
    </>
  );
}

// ─── ModuleBar (main export) ─────────────────────────────────────────────────

const SEP_AFTER = new Set<PhantomModule>(['dashboard', 'sqli', 'phishing', 'c2']);
const Sep = () => <div className="w-7 h-px bg-[#1e2535] my-1 shrink-0" />;

export function ModuleBar({
  active,
  onSelect,
  targets,
  activeTarget,
  activeSubTarget,
  onSwitchTarget,
  onSwitchSubTarget,
}: {
  active: PhantomModule;
  onSelect: (m: PhantomModule) => void;
  targets: PhantomTarget[];
  activeTarget: PhantomTarget;
  activeSubTarget: SubTarget;
  onSwitchTarget: (id: string) => void;
  onSwitchSubTarget: (id: string) => void;
}) {
  const [switcherOpen, setSwitcherOpen] = _useState(false);

  return (
    <div className="relative">
      <div className="w-[52px] shrink-0 bg-[#0f1319] border-r border-[#1e2535] flex flex-col items-center py-2 gap-0.5 z-10 overflow-y-auto [&::-webkit-scrollbar]:w-0 h-full">
        <NavLogo />
        <Sep />

        {/* Dashboard / Target Switcher button — top of nav */}
        <DashboardButton
          isOpen={switcherOpen}
          activeTarget={activeTarget}
          onClick={() => setSwitcherOpen((o) => !o)}
        />
        <Sep />

        {NAV_MODULES.map((item) => (
          <>
            <NavButton
              key={item.id}
              module={item.id}
              title={item.title}
              isActive={active === item.id}
              activeClass={item.activeClass}
              dotColor={item.dotColor}
              onClick={() => {
                onSelect(item.id);
                setSwitcherOpen(false);
              }}
            />
            {SEP_AFTER.has(item.id) && <Sep key={`sep-${item.id}`} />}
          </>
        ))}
        <div className="mt-auto flex flex-col items-center gap-1">
          <Sep />
          <NavButton
            module={'settings' as PhantomModule}
            title="Settings"
            isActive={active === 'settings'}
            activeClass="bg-amber-500/10 text-amber-400 border-amber-500/30"
            onClick={() => {
              onSelect('settings' as PhantomModule);
              setSwitcherOpen(false);
            }}
          />
        </div>
      </div>

      {/* Target Switcher overlay panel */}
      {switcherOpen && (
        <TargetSwitcherPanel
          targets={targets}
          activeTarget={activeTarget}
          activeSubTarget={activeSubTarget}
          onSwitchTarget={(id) => {
            onSwitchTarget(id);
          }}
          onSwitchSubTarget={(id) => {
            onSwitchSubTarget(id);
          }}
          onClose={() => setSwitcherOpen(false)}
        />
      )}
    </div>
  );
}
