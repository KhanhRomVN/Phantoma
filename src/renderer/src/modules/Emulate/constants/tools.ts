/**
 * Cấu hình công cụ (tool) cho tab bar — nguồn dữ liệu duy nhất.
 *
 * Mỗi tool có:
 * - icon:        Lucide icon component
 * - label:       tên hiển thị (vd: "Home")
 * - color:       tên màu Tailwind
 * - accentIndex: thứ tự màu accent trong theme
 * - description: mô tả ngắn
 *
 * Type ToolType được suy ra từ keyof typeof TOOLS.
 * Duyệt danh sách tool qua Object.keys(TOOLS) hoặc Object.values(TOOLS).
 */
import { LayoutPanelLeft, Package, Code, ScrollText, FolderOpen, Smartphone } from 'lucide-react';

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

export type ToolType = keyof typeof TOOLS;

export const DEFAULT_TOOL: ToolType = 'home';