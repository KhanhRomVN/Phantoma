import { SessionStatus, TaskStatus, ProcessStatus, AgentVisualState } from '../types/session.types';

// ─── Constants ──────────────────────────────────────────────────────────

export const STATUS_ORDER: SessionStatus[] = [
  'blocked',
  'running',
  'review',
  'queued',
  'done',
  'idle',
];

export const STATUS_LABELS: Record<SessionStatus, string> = {
  running: 'Running',
  review: 'Review',
  blocked: 'Blocked',
  queued: 'Queued',
  done: 'Done',
  idle: 'Idle',
};

/** Dot background per status (mockup: running green, review amber, done teal) */
export const STATUS_COLORS: Record<SessionStatus, string> = {
  running: 'bg-[#3ddc84]',
  review: 'bg-[#ffb020]',
  blocked: 'bg-[#ff4757]',
  queued: 'bg-[#4a4d57]',
  done: 'bg-[#32c8be]',
  idle: 'border-[2px] [border-style:dashed] [border-spacing:2px] border-text-secondary/50 bg-transparent',
};

export const STATUS_TEXT_COLORS: Record<SessionStatus, string> = {
  running: 'text-[#3ddc84]',
  review: 'text-[#ffb020]',
  blocked: 'text-[#ff4757]',
  queued: 'text-text-secondary',
  done: 'text-[#32c8be]',
  idle: 'text-text-secondary/50',
};

export const TASK_STATUSES: [TaskStatus, string][] = [
  ['todo', 'To do'],
  ['progress', 'In progress'],
  ['done', 'Done'],
];

export const TASK_COLORS: Record<TaskStatus, string> = {
  todo: '#6b7280',
  progress: '#3b82f6',
  done: '#10b981',
};

export const PROCESS_COLORS: Record<ProcessStatus, string> = {
  live: '#3ddc84',
  busy: '#4fa8e0',
  crashed: '#ff4757',
};

export const AGENT_STATE_LABELS: Record<AgentVisualState, string> = {
  run: 'Running',
  err: 'Error',
  wait: 'Waiting for you',
  que: 'Queued',
  done: 'Done',
};

export const AGENT_STATE_ORDER: AgentVisualState[] = ['err', 'wait', 'run', 'que', 'done'];
