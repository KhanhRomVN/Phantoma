import type { MouseEvent } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────

export type SessionStatus = 'running' | 'review' | 'blocked' | 'queued' | 'done' | 'idle';

export type TaskStatus = 'todo' | 'progress' | 'done';

export type ProcessStatus = 'live' | 'busy' | 'crashed';

/** Visual state of an agent avatar ring */
export type AgentVisualState = 'run' | 'err' | 'wait' | 'que' | 'done';

export interface MenuPosition {
  top: number;
  left: number;
}

export interface SubAgentInfo {
  name: string;
  status: SessionStatus;
}

export interface AgentInfo {
  name: string;
  color: string;
  initials: string;
  /** 'running' = working */
  status: SessionStatus;
  subs?: SubAgentInfo[];
}

export interface TaskInfo {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface ProcessInfo {
  cmd: string;
  status: ProcessStatus;
  port?: number;
  exitCode?: number;
  terminalId?: string;
  panelId?: string;
}

export interface SessionSummary {
  tokens: number;
  cost: number;
  added: number;
  removed: number;
  files: number;
  duration: string;
}

export interface SessionInfo {
  id: string;
  title: string;
  status: SessionStatus;
  time: string;
  agents: AgentInfo[];
  summary: SessionSummary;
  hint?: string;
  task?: TaskInfo;
  procs?: ProcessInfo[];
}

export interface BranchInfo {
  name: string;
  visible: boolean;
  sessions: SessionInfo[];
  path?: string;
  remote?: boolean;
}

export type ProcessInteractHandler = (
  action: 'select' | 'menu',
  sessionId: string,
  index: number,
  e: MouseEvent,
) => void;
