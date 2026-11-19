import type { DeviceStatus, ProxyStatus, ScriptStatus } from '../types';
import type { Tone } from './tone';

export const DEVICE_STATUS: Record<DeviceStatus, { label: string; tone: Tone; pulse?: boolean; spin?: boolean }> = {
  online: { label: 'Online', tone: 'success', pulse: true },
  busy: { label: 'Running', tone: 'primary', spin: true },
  idle: { label: 'Idle', tone: 'info' },
  updating: { label: 'Updating', tone: 'info', spin: true },
  offline: { label: 'Offline', tone: 'muted' },
  error: { label: 'Error', tone: 'error' },
  locked: { label: 'Locked', tone: 'warn' },
  maintenance: { label: 'Maintenance', tone: 'warn' },
};

export const PROXY_STATUS: Record<ProxyStatus, { label: string; tone: Tone }> = {
  ok: { label: 'OK', tone: 'success' },
  slow: { label: 'Slow', tone: 'warn' },
  down: { label: 'Down', tone: 'error' },
};

export const SCRIPT_STATUS: Record<ScriptStatus, { label: string; tone: Tone; spin?: boolean }> = {
  running: { label: 'Running', tone: 'primary', spin: true },
  success: { label: 'Success', tone: 'success' },
  failed: { label: 'Failed', tone: 'error' },
  queued: { label: 'Queued', tone: 'warn' },
  stopped: { label: 'Stopped', tone: 'muted' },
};