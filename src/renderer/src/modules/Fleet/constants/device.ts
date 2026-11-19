import { Smartphone, Apple, Monitor, Laptop, Server } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DeviceType } from '../types';
import type { Tone } from './tone';

export const DEVICE_TYPE: Record<DeviceType, { icon: LucideIcon; label: string; color: Tone }> = {
  android: { icon: Smartphone, label: 'Android', color: 'success' },
  ios: { icon: Apple, label: 'iOS', color: 'primary' },
  windows: { icon: Monitor, label: 'Windows', color: 'info' },
  macos: { icon: Laptop, label: 'macOS', color: 'primary' },
  linux: { icon: Monitor, label: 'Linux', color: 'warn' },
  vps: { icon: Server, label: 'VPS', color: 'info' },
};

export const DEVICE_KIND: Record<string, DeviceType[]> = {
  mobile: ['android', 'ios'],
  desktop: ['windows', 'macos', 'linux'],
  vps: ['vps'],
};