import { Globe, Monitor, Smartphone, Terminal } from 'lucide-react';

export const PLATFORMS = {
  website: {
    id: 'website',
    label: 'Website',
    icon: Globe,
    color: 'sky',
    description: 'Web application or website',
    placeholder: 'https://example.com',
  },
  application: {
    id: 'application',
    label: 'Application',
    icon: Monitor,
    color: 'violet',
    description: 'Desktop application',
    placeholder: '/path/to/app',
  },
  terminal: {
    id: 'terminal',
    label: 'Terminal',
    icon: Terminal,
    color: 'amber',
    description: 'Command-line interface tool',
    placeholder: 'command --arg',
  },
} as const;

export const MOBILE_PLATFORM = {
  id: 'android',
  label: 'Mobile',
  icon: Smartphone,
  color: 'emerald',
  description: 'Android mobile app',
  placeholder: 'com.example.app',
} as const;

export const LAUNCH_PLATFORMS = {
  ...PLATFORMS,
  android: MOBILE_PLATFORM,
} as const;

export type LaunchPlatform = keyof typeof LAUNCH_PLATFORMS;

const APP_TO_LAUNCH: Record<string, LaunchPlatform> = {
  web: 'website',
  pc: 'application',
  cli: 'terminal',
  android: 'android',
};

export const toLaunchPlatform = (p: string): LaunchPlatform => APP_TO_LAUNCH[p] ?? 'website';