/**
 * Cấu hình công cụ (tool) cho tab bar — nguồn dữ liệu duy nhất.
 * Mỗi tool có icon, label, màu accent và mô tả.
 */

import { LayoutPanelLeft, Package, Code, ScrollText, FolderOpen, FileText } from 'lucide-react';

export const TOOLS = {
  home: {
    icon: LayoutPanelLeft,
    label: 'Home',
    color: 'blue',
    accentIndex: 0,
    description: 'Request inspector and interceptor',
  },
  fuzzer: {
    icon: Package,
    label: 'Fuzzer',
    color: 'orange',
    accentIndex: 2,
    description: 'Fuzz requests with payloads',
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
  report: {
    icon: FileText,
    label: 'Report',
    color: 'indigo',
    accentIndex: 8,
    description: 'Markdown report viewer',
  },
  log: {
    icon: ScrollText,
    label: 'Log',
    color: 'red',
    accentIndex: 5,
    description: 'Android logcat viewer',
  },
} as const;

export type ToolType = keyof typeof TOOLS;

export const DEFAULT_TOOL: ToolType = 'home';