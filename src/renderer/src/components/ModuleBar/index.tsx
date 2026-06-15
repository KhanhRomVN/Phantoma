import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../shared/lib/utils';
import { NavModuleConfig, PhantomModule, SubMenuItem } from '../../features/Tool/types/types';
import {
  Settings as SettingsIcon,
  Crosshair as CrosshairIcon,
  Wrench as WrenchIcon,
} from 'lucide-react';

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
    children: [
      { id: 'recon-domain', title: 'Domain', disabled: false },
      { id: 'recon-ip', title: 'IP', disabled: false },
      { id: 'recon-person', title: 'Person', disabled: false },
    ],
  },
  {
    id: 'scanner',
    title: 'Scanner',
    activeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    children: [
      { id: 'scan-domain', title: 'Domain', disabled: false },
      { id: 'scan-network', title: 'Network', disabled: false },
      { id: 'scan-website', title: 'Website', disabled: false },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    activeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'emulate',
    title: 'Emulate',
    activeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  {
    id: 'wireless',
    title: 'Wireless',
    activeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
];

// ─── NavLogo ─────────────────────────────────────────────────────────────────
function NavLogo({ expanded }: { expanded: boolean }) {
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
      title="PHANTOMA"
    >
      <svg
        className="w-[18px] h-[18px] text-primary shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 2L3 7v10l9 5 9-5V7z" />
        <path d="M12 12L3 7M12 12v10M12 12l9-5" />
      </svg>
      {expanded && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="ml-4 text-sm font-mono text-primary whitespace-nowrap"
        >
          PHANTOMA
        </motion.span>
      )}
    </div>
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
    case 'emulate':
      return (
        <svg {...p}>
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 5.5v5M5.5 8h5" />
        </svg>
      );
    case 'wireless':
      return (
        <svg {...p}>
          <circle cx="8" cy="6" r="3" />
          <path d="M2 11c2-3 4-4 6-4s4 1 6 4" />
          <path d="M4 13c1-1.5 2.5-2 4-2s3 .5 4 2" />
          <path d="M6 15c0.5-0.5 1-1 2-1s1.5 0.5 2 1" />
          <circle cx="8" cy="15" r="1" fill="currentColor" />
        </svg>
      );
    case 'tools':
      return <WrenchIcon className="w-4 h-4" strokeWidth={1.3} />;
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
  expanded,
}: {
  module: PhantomModule;
  title: string;
  isActive: boolean;
  activeClass: string;
  dotColor?: string;
  onClick: () => void;
  expanded: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full flex items-center gap-3 transition-all duration-200',
        expanded ? 'px-3 py-2 rounded-lg' : 'w-9 h-9 px-0 rounded-md justify-center',
        isActive
          ? activeClass
          : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover',
        !expanded && 'mx-auto',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center shrink-0',
          expanded ? 'w-5 h-5' : 'w-4 h-4',
        )}
      >
        <NavIcon module={module} />
      </div>
      {expanded && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          exit={{ opacity: 0, width: 0 }}
          className="text-[13px] font-medium truncate flex-1 text-left whitespace-nowrap overflow-hidden"
        >
          {title}
        </motion.span>
      )}
      {dotColor && !isActive && expanded && (
        <span className={cn('absolute top-2 right-2 w-1.5 h-1.5 rounded-full', dotColor)} />
      )}
    </button>
  );
}

// ─── SubMenuItemButton ──────────────────────────────────────────────────────
function SubMenuItemButton({
  item,
  onSelect,
  isActive,
  expanded,
}: {
  item: SubMenuItem;
  onSelect: () => void;
  isActive: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  expanded: boolean;
}) {
  if (!expanded) return null;

  return (
    <button
      onClick={onSelect}
      disabled={item.disabled}
      className={cn(
        'w-full flex items-center gap-2 pl-6 py-1.5 text-left transition-all duration-200 text-sm',
        isActive && !item.disabled
          ? 'text-text-primary'
          : item.disabled
            ? 'text-border cursor-not-allowed opacity-50'
            : 'text-text-secondary hover:text-text-primary',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          isActive && !item.disabled
            ? 'bg-text-primary ring-1 ring-text-primary ring-opacity-50'
            : item.disabled
              ? 'bg-border'
              : 'bg-divider',
        )}
      />
      <span className="text-[13px]">{item.title}</span>
      {item.disabled && <span className="ml-auto text-[8px] text-border">(soon)</span>}
    </button>
  );
}

// ─── ModuleBar (main export) ─────────────────────────────────────────────────
export function ModuleBar({
  active,
  onSelect,
  activeSubItem,
  onSubItemSelect,
}: {
  active: PhantomModule;
  onSelect: (m: PhantomModule) => void;
  activeSubItem?: string | null;
  onSubItemSelect?: (subItemId: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const expanded = isHovered;

  const handleSubItemClick = (item: NavModuleConfig, subItem: SubMenuItem) => {
    if (subItem.disabled) return;
    onSelect(item.id);
    onSubItemSelect?.(subItem.id);
  };

  const modulesWithChildren = NAV_MODULES.filter((m) => m.children && m.children.length > 0);
  const activeModuleWithChildren = modulesWithChildren.find((m) => m.id === active);

  return (
    <motion.div
      className="relative h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ width: expanded ? 240 : 48 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="h-full shrink-0 bg-sidebar-background border-r border-border flex flex-col z-10 overflow-y-auto [&::-webkit-scrollbar]:w-0">
        <div
          className={cn(
            'w-full h-[37px] flex items-center shrink-0',
            expanded ? 'px-3 justify-start' : 'justify-center',
          )}
        >
          <NavLogo expanded={expanded} />
        </div>
        <div className="w-full h-px bg-divider shrink-0" />

        <div
          className={cn('flex flex-col gap-1 w-full py-2', expanded ? 'px-2' : 'px-0 items-center')}
        >
          {NAV_MODULES.map((item) => (
            <div key={item.id}>
              <NavButton
                module={item.id}
                title={item.title}
                isActive={active === item.id}
                activeClass={item.activeClass}
                dotColor={item.dotColor}
                onClick={() => onSelect(item.id)}
                expanded={expanded}
              />
              {expanded &&
                item.id === active &&
                activeModuleWithChildren?.id === item.id &&
                item.children && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative mt-1 overflow-hidden"
                  >
                    {item.children.map((child, index) => (
                      <SubMenuItemButton
                        key={child.id}
                        item={child}
                        isActive={child.id === activeSubItem}
                        isFirst={index === 0}
                        isLast={index === item.children!.length - 1}
                        onSelect={() => handleSubItemClick(item, child)}
                        expanded={expanded}
                      />
                    ))}
                  </motion.div>
                )}
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-1 px-2 pb-3">
          <NavButton
            module={'settings' as PhantomModule}
            title="Settings"
            isActive={active === 'settings'}
            activeClass="bg-amber-500/10 text-amber-400 border-amber-500/30"
            onClick={() => onSelect('settings' as PhantomModule)}
            expanded={expanded}
          />
        </div>
      </div>
    </motion.div>
  );
}
