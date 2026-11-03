import type { ModeBehaviorConfig as CodeModeBehaviorConfig } from "../../code/config";
import { MODE_BEHAVIORS as CODE_MODE_BEHAVIORS } from "../../code/config";

export type ToolFormat = "xml" | "json";

export type SystemPromptMode = "balanced";
export type ModeBehaviorConfig = CodeModeBehaviorConfig;

export interface SystemInfo {
  os: string;
  shell: string;
  homeDir: string;
  cwd: string;
  language: string;
}

export const MODE_BEHAVIORS: Record<SystemPromptMode, ModeBehaviorConfig> = {
  balanced: CODE_MODE_BEHAVIORS.balanced,
};

export interface WorkflowAgentPromptConfig {
  toolFormat: ToolFormat;
  language: string;
  systemInfo: SystemInfo;
  mode?: SystemPromptMode;
  promptLengthMode?: "short" | "medium" | "long" | "full" | "none";
}

export const joinSections = (...sections: (string | null | undefined)[]): string =>
  sections.filter((s): s is string => Boolean(s?.trim())).join("\n\n");