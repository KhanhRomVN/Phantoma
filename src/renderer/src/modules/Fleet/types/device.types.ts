export type DeviceType = 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'vps';
export type DeviceStatus = 'online' | 'busy' | 'idle' | 'updating' | 'offline' | 'error' | 'locked' | 'maintenance';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  os: string;
  groupId: string;
  status: DeviceStatus;
  cpu: number;
  ram: number;
  disk: number;
  battery: number | null;
  proxyId: string | null;
  ip: string;
  location: string;
  lastSeen: string;
  tags: string[];
  createdAt: string;
  uptime?: string;
  temperature?: number;
  ping?: number;
}

export interface DeviceGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  deviceCount?: number;
}