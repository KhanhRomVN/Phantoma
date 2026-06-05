import { cn } from '../../../../shared/lib/utils';
import { NavModuleConfig, PhantomModule } from '../../types/types';
import { useState as _useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings as SettingsIcon, Crosshair as CrosshairIcon } from 'lucide-react';

const NAV_MODULES: NavModuleConfig[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    activeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  {
    id: 'osint',
    title: 'OSINT',
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
      className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
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
    case 'osint':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="6" />
          <path d="M14 14l-2-2" />
          <circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.5" />
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
      return <SettingsIcon className="w-4 h-4" strokeWidth={1.3} />;
    case 'target':
      return <CrosshairIcon className="w-4 h-4" strokeWidth={1.3} />;
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

// ─── ModuleBar (main export) ─────────────────────────────────────────────────

export function ModuleBar({
  active,
  onSelect,
}: {
  active: PhantomModule;
  onSelect: (m: PhantomModule) => void;
}) {
  return (
    <div className="relative">
      <div className="w-[52px] shrink-0 bg-[#0f1319] border-r border-[#1e2535] flex flex-col items-center z-10 overflow-y-auto [&::-webkit-scrollbar]:w-0 h-full">
        <div className="w-full h-[37px] flex items-center justify-center shrink-0">
          <NavLogo />
        </div>
        <div className="w-full h-px bg-[#1e2535] shrink-0" />

        <div className="flex flex-col items-center gap-0.5 w-full px-1.5 py-1.5">
          {NAV_MODULES.map((item) => (
            <NavButton
              key={item.id}
              module={item.id}
              title={item.title}
              isActive={active === item.id}
              activeClass={item.activeClass}
              dotColor={item.dotColor}
              onClick={() => onSelect(item.id)}
            />
          ))}
        </div>
        <div className="mt-auto flex flex-col items-center gap-1 pb-2">
          <NavButton
            module={'target' as PhantomModule}
            title="Target Manager"
            isActive={active === 'target'}
            activeClass="bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
            onClick={() => onSelect('target' as PhantomModule)}
          />
          <NavButton
            module={'settings' as PhantomModule}
            title="Settings"
            isActive={active === 'settings'}
            activeClass="bg-amber-500/10 text-amber-400 border-amber-500/30"
            onClick={() => onSelect('settings' as PhantomModule)}
          />
        </div>
      </div>
    </div>
  );
}
