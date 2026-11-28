// ─── Imports ─────────────────────────────────────────────────────────────────
// ── UI ──
import {
  Circle,
  Square,
  Triangle,
  Diamond,
  Pentagon,
  Hexagon,
  Octagon,
  Star,
  Heart,
  Moon,
  Sun,
  Cloud,
  Zap,
  Flame,
  Droplet,
  Leaf,
  Bookmark,
  Flag,
  CircleCheckBig,
  type LucideIcon,
} from 'lucide-react';

// ── Components ──
import { ProjectLogoImage } from '../ProjectLogo';

// ── Utils ──
import {
  PROJECT_IDENTITY_COLORS as PROJECT_COLORS,
} from '../../../../shared/constants/project-colors';

// ─── Constants ───────────────────────────────────────────────────────────────
export const PROJECT_ICONS: LucideIcon[] = [
  Circle,
  Square,
  Triangle,
  Diamond,
  Pentagon,
  Hexagon,
  Octagon,
  Star,
  Heart,
  Moon,
  Sun,
  Cloud,
  Zap,
  Flame,
  Droplet,
  Leaf,
  Bookmark,
  Flag,
  CircleCheckBig,
];

// ─── Functions ───────────────────────────────────────────────────────────────
/** Stable pseudo-random icon + color per project (same seed → same result). */
export function getProjectIdentity(seed: string): { color: string; Icon: LucideIcon } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  return {
    color: PROJECT_COLORS[abs % PROJECT_COLORS.length],
    Icon: PROJECT_ICONS[Math.floor(abs / PROJECT_COLORS.length) % PROJECT_ICONS.length],
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
/** Colored project icon (color-mix tinted background) */
export function ProjectIcon({
  color,
  Icon,
  logoPath,
}: {
  color: string;
  Icon: LucideIcon;
  logoPath?: string | null;
}) {
  // ── Derived ──
  const fallback = (
    <span
      className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center shrink-0 self-center"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <Icon className="w-[15px] h-[15px]" />
    </span>
  );
  if (!logoPath) return fallback;

  // ── Render ──
  return (
    <span className="w-[26px] h-[26px] rounded-[8px] overflow-hidden flex items-center justify-center shrink-0 self-center">
      <ProjectLogoImage
        path={logoPath}
        side={52}
        className="w-full h-full object-contain"
        fallback={fallback}
      />
    </span>
  );
}
