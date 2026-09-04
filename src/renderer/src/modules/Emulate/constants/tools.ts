/**
 * ------------------------------------------------------------------
 * Tool Constants
 * ------------------------------------------------------------------
 * Cấu hình công cụ (tool) cho tab bar — nguồn dữ liệu duy nhất.
 * Mỗi tool có icon, label, màu accent và mô tả.
 *
 * Các exports chính:
 * - TOOLS        : Map cấu hình tất cả tools
 * - ToolType     : Type suy ra từ key của TOOLS
 * - DEFAULT_TOOL : Tool mặc định (home)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── UI ──
import { LayoutPanelLeft, Package, Code, Code2, ScrollText, FolderOpen, Smartphone } from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────
export const TOOLS = {
  home: {
    icon: LayoutPanelLeft,
    label: 'Home',
    color: 'blue',
    accentIndex: 0,
    description: 'Request inspector and interceptor',
  },
  intruder: {
    icon: LayoutPanelLeft,
    label: 'Intruder',
    color: 'purple',
    accentIndex: 1,
    description: 'Automated attack and fuzzing',
  },
  repeater: {
    icon: Package,
    label: 'Repeater',
    color: 'orange',
    accentIndex: 2,
    description: 'Manual request replay with payloads',
  },
  resource: {
    icon: FolderOpen,
    label: 'Resource',
    color: 'teal',
    accentIndex: 3,
    description: 'View and manage page resources',
  },
  source: {
    icon: Code,
    label: 'Source',
    color: 'yellow',
    accentIndex: 4,
    description: 'Source code viewer',
  },
  code: {
    icon: Code2,
    label: 'Code',
    color: 'cyan',
    accentIndex: 7,
    description: 'Code viewer and file explorer',
  },
  log: {
    icon: ScrollText,
    label: 'Log',
    color: 'red',
    accentIndex: 5,
    description: 'Android logcat viewer',
  },
  device: {
    icon: Smartphone,
    label: 'Device',
    color: 'emerald',
    accentIndex: 6,
    description: 'Android device management',
  },
} as const;

// ─── Types ──────────────────────────────────────────────────────────────
export type ToolType = keyof typeof TOOLS;

// ─── Constants ──────────────────────────────────────────────────────────
export const DEFAULT_TOOL: ToolType = 'home';