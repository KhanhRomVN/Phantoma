/**
 * ------------------------------------------------------------------
 * Agent Group Types
 * ------------------------------------------------------------------
 * Type definitions for agent group management system.
 * Agent groups allow running multiple AI coding agents (Claude Code,
 * Codex, etc.) simultaneously in split terminal views.
 * ------------------------------------------------------------------
 */

export type TerminalLayout = 'single' | 'horizontal-2' | 'vertical-2' | 'grid-4';

export type AgentType = 'claude-code' | 'codex' | 'cursor' | 'gemini' | 'custom';

export interface AgentTerminal {
  id: string;
  agentType: AgentType;
  command: string;
  workingDir: string;
  isActive: boolean;
  status: 'idle' | 'running' | 'error';
  lastOutput?: string;
}

export interface AgentGroup {
  id: string;
  name: string;
  description?: string;
  layout: TerminalLayout;
  terminals: AgentTerminal[];
  createdAt: number;
  updatedAt: number;
  color?: string;
}

export type AgentGroupInput = Omit<AgentGroup, 'id' | 'createdAt' | 'updatedAt'>;

export interface AgentConfig {
  type: AgentType;
  label: string;
  icon: string;
  defaultCommand: string;
  description: string;
  color: string;
}
