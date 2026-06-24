// Platform configuration
import { Globe, Monitor, Smartphone, Terminal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AppPlatform = 'web' | 'pc' | 'android' | 'cli';

export interface PlatformConfig {
  id: AppPlatform;
  label: string;
  icon: LucideIcon;
  color: string;
  colorClass: string;
  bgClass: string;
  description: string;
  placeholder: string;
}

export const PLATFORMS: Record<AppPlatform, PlatformConfig> = {
  web: {
    id: 'web',
    label: 'Website',
    icon: Globe,
    color: '#38bdf8',
    colorClass: 'text-sky-400',
    bgClass: 'bg-sky-500/15',
    description: 'Web application or website',
    placeholder: 'https://example.com',
  },
  pc: {
    id: 'pc',
    label: 'PC App',
    icon: Monitor,
    color: '#a78bfa',
    colorClass: 'text-violet-400',
    bgClass: 'bg-violet-500/15',
    description: 'Desktop application',
    placeholder: '/path/to/app',
  },
  android: {
    id: 'android',
    label: 'Mobile',
    icon: Smartphone,
    color: '#34d399',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/15',
    description: 'Android mobile app',
    placeholder: 'com.example.app',
  },
  cli: {
    id: 'cli',
    label: 'CLI',
    icon: Terminal,
    color: '#fbbf24',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/15',
    description: 'Command-line interface tool',
    placeholder: 'command --arg',
  },
};

export const PLATFORM_LIST: AppPlatform[] = ['web', 'pc', 'android', 'cli'];

export function getPlatformConfig(platform: AppPlatform): PlatformConfig {
  return PLATFORMS[platform];
}

export function getPlatformLabel(platform: AppPlatform): string {
  return PLATFORMS[platform].label;
}

export function getPlatformColor(platform: AppPlatform): string {
  return PLATFORMS[platform].color;
}

export function getPlatformColorClass(platform: AppPlatform): string {
  return PLATFORMS[platform].colorClass;
}

export function getPlatformIcon(platform: AppPlatform): LucideIcon {
  return PLATFORMS[platform].icon;
}