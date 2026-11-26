/**
 * ------------------------------------------------------------------
 * Platform Constants
 * ------------------------------------------------------------------
 * Cấu hình nền tảng (platform) — nguồn dữ liệu duy nhất.
 * Mỗi platform có id, label, icon, màu và mô tả.
 *
 * Các exports chính:
 * - PLATFORMS     : Map cấu hình tất cả platforms
 * - AppPlatform   : Type suy ra từ key của PLATFORMS
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── UI ──
import { Globe, Monitor, Smartphone, Terminal } from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────
export const PLATFORMS = {
  web: {
    id: 'web',
    label: 'Website',
    icon: Globe,
    color: 'sky',
    description: 'Web application or website',
    placeholder: 'https://example.com',
  },
  pc: {
    id: 'pc',
    label: 'PC App',
    icon: Monitor,
    color: 'violet',
    description: 'Desktop application',
    placeholder: '/path/to/app',
  },
  android: {
    id: 'android',
    label: 'Mobile',
    icon: Smartphone,
    color: 'emerald',
    description: 'Android mobile app',
    placeholder: 'com.example.app',
  },
  cli: {
    id: 'cli',
    label: 'CLI',
    icon: Terminal,
    color: 'amber',
    description: 'Command-line interface tool',
    placeholder: 'command --arg',
  },
} as const;

// ─── Types ──────────────────────────────────────────────────────────────
export type AppPlatform = keyof typeof PLATFORMS;