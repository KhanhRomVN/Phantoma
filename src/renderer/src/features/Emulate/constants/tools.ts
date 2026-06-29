// Tool configuration for Emulate main tabs
import { LayoutPanelLeft, Package, Code, ScrollText, FolderOpen, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ToolType = 'home' | 'intruder' | 'repeater' | 'resource' | 'source' | 'log' | 'device';

export interface ToolConfig {
  id: ToolType;
  icon: LucideIcon;
  label: string;
  color: string;
  accentIndex: number;
  description: string;
}

export const TOOLS: Record<ToolType, ToolConfig> = {
  home: {
    id: 'home',
    icon: LayoutPanelLeft,
    label: 'Home',
    color: 'blue',
    accentIndex: 0,
    description: 'Request inspector and interceptor',
  },
  intruder: {
    id: 'intruder',
    icon: LayoutPanelLeft,
    label: 'Intruder',
    color: 'purple',
    accentIndex: 1,
    description: 'Automated attack and fuzzing',
  },
  repeater: {
    id: 'repeater',
    icon: Package,
    label: 'Repeater',
    color: 'orange',
    accentIndex: 2,
    description: 'Manual request replay with payloads',
  },
  resource: {
    id: 'resource',
    icon: FolderOpen,
    label: 'Resource',
    color: 'teal',
    accentIndex: 3,
    description: 'View and manage page resources',
  },
  source: {
    id: 'source',
    icon: Code,
    label: 'Source',
    color: 'yellow',
    accentIndex: 4,
    description: 'Source code viewer',
  },
  log: {
    id: 'log',
    icon: ScrollText,
    label: 'Log',
    color: 'red',
    accentIndex: 5,
    description: 'Android logcat viewer',
  },
  device: {
    id: 'device',
    icon: Smartphone,
    label: 'Device',
    color: 'emerald',
    accentIndex: 6,
    description: 'Android device management',
  },
};

export const TOOL_LIST: ToolType[] = ['home', 'intruder', 'repeater', 'resource', 'source', 'log', 'device'];

export function getToolConfig(tool: ToolType): ToolConfig {
  return TOOLS[tool];
}

export function getToolLabel(tool: ToolType): string {
  return TOOLS[tool].label;
}

export function getToolColor(tool: ToolType): string {
  return TOOLS[tool].color;
}

export const DEFAULT_TOOL: ToolType = 'home';