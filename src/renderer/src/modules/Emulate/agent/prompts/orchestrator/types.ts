export type ToolFormat = 'xml' | 'json';

export type SystemPromptMode = 'fast' | 'balanced' | 'thorough' | 'short' | 'none';
export type PromptLengthMode = 'short' | 'medium' | 'long' | 'none';

export interface SystemInfo {
  os: string;
  shell: string;
  homeDir: string;
  cwd: string;
  language: string;
}

export interface WorkflowAgentPromptConfig {
  language: string;
  systemInfo: SystemInfo;
  promptLengthMode?: PromptLengthMode;
  toolFormat?: ToolFormat;
  mode?: SystemPromptMode;
}

export const joinSections = (sections: string[]): string =>
  sections.filter((section) => section.length > 0).join('\n\n---\n\n');