export type SystemPromptMode = 'fast' | 'balanced' | 'thorough';

export type ToolFormat = 'xml' | 'json';

export interface SystemInfo {
  os: string;
  shell: string;
  homeDir: string;
  cwd: string;
  language: string;
}

export interface EmulatePromptConfig {
  toolFormat: ToolFormat;
  language: string;
  systemInfo: SystemInfo;
  mode?: SystemPromptMode;
  promptLengthMode?: 'short' | 'medium' | 'long' | 'full' | 'none';
}

export const joinSections = (...sections: (string | null | undefined)[]): string =>
  sections.filter((s): s is string => Boolean(s?.trim())).join('\n\n');

export interface ModeBehaviorConfig {
  askConfirmation: 'minimal' | 'moderate' | 'extensive' | 'almost-never';
  explanationLevel: 'one-line' | 'brief' | 'detailed';
  maxBatchSize: number;
}

export const MODE_BEHAVIORS: Record<SystemPromptMode, ModeBehaviorConfig> = {
  fast: {
    askConfirmation: 'almost-never',
    explanationLevel: 'one-line',
    maxBatchSize: 5,
  },
  balanced: {
    askConfirmation: 'moderate',
    explanationLevel: 'brief',
    maxBatchSize: 5,
  },
  thorough: {
    askConfirmation: 'extensive',
    explanationLevel: 'detailed',
    maxBatchSize: 3,
  },
};