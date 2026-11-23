import type { PlatformFamily } from './platform.type';

export interface DeviceFingerprint {
  family: PlatformFamily;
  os: string;
  browser: string;
  gpu: string;
  cores: number;
  memory: number;
  lang: string;
  tz: string;
  cc: string;
}
