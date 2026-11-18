export type ScriptLanguage = 'JS' | 'Python' | 'Shell';
export type ScriptStatus = 'running' | 'success' | 'failed' | 'queued' | 'stopped';

export interface Script {
  id: string;
  name: string;
  description: string;
  language: ScriptLanguage;
  targets: DeviceType[];
  duration: string;
  successRate: number;
  totalRuns: number;
  tags: string[];
}

export interface ScriptRun {
  id: string;
  scriptId: string;
  deviceId: string;
  status: ScriptStatus;
  startedAt: string;
  duration: string;
  triggeredBy: string;
}

import type { DeviceType } from './device.types';