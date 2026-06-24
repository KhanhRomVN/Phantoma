import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../shared/lib/utils';
import { NavModuleConfig, PhantomModule, SubMenuItem } from '../../features/Tool/types/types';
import {
  Settings as SettingsIcon,
  Crosshair as CrosshairIcon,
  Wrench as WrenchIcon,
} from 'lucide-react';
import { useAccentColors } from '../../shared/hooks/useAccentColors';

// ─── Color Helper ──────────────────────────────────────────────────────────
// Helper to get color for a module (deterministic based on module id)
// This needs to be defined before the components that use it
let accentColorsCache: string[] = ['rgb(54, 134, 255)'];
let unifiedAccentCache = 'rgb(54, 134, 255)';

export const setAccentColorsForModuleBar = (colors: string[], unified: string) => {
  accentColorsCache = colors.length > 0 ? colors : [unified];
  unifiedAccentCache = unified;
};

const getModuleColor = (moduleId: PhantomModule) => {
  // Use module id to deterministically pick a color
  let hash = 0;
  for (let i = 0; i < moduleId.length; i++) {
    hash = moduleId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % accentColorsCache.length;
  const color = accentColorsCache[index] || accentColorsCache[0] || unifiedAccentCache;

  // Parse RGB values to create opacity variants
  const rgbMatch = color.match(/\d+/g);
  if (rgbMatch && rgbMatch.length >= 3) {
    const r = rgbMatch[0];
    const g = rgbMatch[1];
    const b = rgbMatch[2];
    return {
      base: color,
      bg: `rgba(${r}, ${g}, ${b}, 0.1)`,
      border: `rgba(${r}, ${g}, ${b}, 0.3)`,
      hover: `rgba(${r}, ${g}, ${b}, 0.2)`,
    };
  }
  return {
    base: color || unifiedAccentCache,
    bg: 'var(--sidebar-item-hover)',
    border: 'var(--divider)',
    hover: 'var(--sidebar-item-hover)',
  };
};

const NAV_MODULES: NavModuleConfig[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
  },
  {
    id: 'recon',
    title: 'Reconnaissance',
    children: [
      { id: 'recon-domain', title: 'Domain', disabled: false },
      { id: 'recon-ip', title: 'IP', disabled: false },
      { id: 'recon-person', title: 'Person', disabled: false },
    ],
  },
  {
    id: 'scanner',
    title: 'Scanner',
    children: [
      { id: 'scan-domain', title: 'Domain', disabled: false },
      { id: 'scan-network', title: 'Network', disabled: false },
      { id: 'scan-website', title: 'Website', disabled: false },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
  },
  {
    id: 'emulate',
    title: 'Emulate',
  },
  {
    id: 'wireless',
    title: 'Wireless',
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
  moduleId: PhantomModule;
}) {
  if (!expanded) return null;

  return (
    <button
      onClick={onSelect}
      disabled={item.disabled}
      className={cn(
        'w-full flex items-center gap-2 pl-6 py-1.5 text-left transition-all duration-200 text-sm',
        !isActive && !item.disabled && 'text-text-secondary hover:text-text-primary',
        item.disabled && 'text-text-secondary cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          item.disabled ? 'bg-border' : 'bg-divider',
        )}
      />
      <span className="text-[13px] font-semibold">{item.title}</span>
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
  const { accentColors, UNIFIED_ACCENT } = useAccentColors();

  // Update the global color cache for getModuleColor
  // We need to do this on each render to keep colors in sync with theme
  if (typeof accentColors !== 'undefined' && accentColors.length > 0) {
    setAccentColorsForModuleBar(accentColors, UNIFIED_ACCENT);
  }

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
      {/* Border-left with divider */}
      <div className="h-full shrink-0 bg-sidebar-background border border-l border-border flex flex-col z-10 overflow-y-auto [&::-webkit-scrollbar]:w-0">
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
          {NAV_MODULES.map((item) => {
            const moduleColor = getModuleColor(item.id);
            const isActive = active === item.id;

            return (
              <div key={item.id}>
                <button
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    'relative w-full flex items-center gap-3 transition-all duration-200',
                    expanded ? 'px-3 py-2 rounded-lg' : 'w-9 h-9 px-0 rounded-md justify-center',
                    !expanded && 'mx-auto',
                    !isActive &&
                      'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
                    isActive && 'text-[--module-color]',
                    !expanded && 'border-l-2 border-solid',
                    !expanded && 'border-transparent',
                  )}
                  style={
                    isActive
                      ? ({
                          '--module-color': moduleColor?.base || 'var(--text-primary)',
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  <div
                    className={cn(
                      'flex items-center justify-center shrink-0',
                      expanded ? 'w-5 h-5' : 'w-4 h-4',
                    )}
                  >
                    <NavIcon module={item.id} />
                  </div>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className={cn(
                        'text-[13px] font-semibold truncate flex-1 text-left whitespace-nowrap overflow-hidden',
                      )}
                      style={
                        isActive ? { color: moduleColor?.base || 'var(--text-primary)' } : undefined
                      }
                    >
                      {item.title}
                    </motion.span>
                  )}
                  {item.dotColor && !isActive && expanded && (
                    <span
                      className={cn(
                        'absolute top-2 right-2 w-1.5 h-1.5 rounded-full',
                        item.dotColor,
                      )}
                    />
                  )}
                </button>
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
                          moduleId={item.id}
                        />
                      ))}
                    </motion.div>
                  )}
              </div>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-1 px-2 pb-3">
          <button
            onClick={() => onSelect('settings' as PhantomModule)}
            className={cn(
              'relative w-full flex items-center gap-3 transition-all duration-200',
              expanded ? 'px-3 py-2 rounded-lg' : 'w-9 h-9 px-0 rounded-md justify-center',
              !expanded && 'mx-auto',
              active === 'settings'
                ? 'bg-[rgba(var(--primary),0.1)] text-[rgb(var(--primary))]'
                : 'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
              !expanded && 'border-l-2 border-solid',
              !expanded &&
                (active === 'settings' ? 'border-[rgb(var(--primary))]' : 'border-transparent'),
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center shrink-0',
                expanded ? 'w-5 h-5' : 'w-4 h-4',
              )}
            >
              <SettingsIcon className="w-4 h-4" strokeWidth={1.3} />
            </div>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className={cn(
                  'text-[13px] font-medium truncate flex-1 text-left whitespace-nowrap overflow-hidden',
                  active === 'settings' ? 'text-[rgb(var(--primary))]' : 'text-text-secondary',
                )}
              >
                Settings
              </motion.span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
