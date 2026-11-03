import type { SystemPromptMode } from "../../code/config";
import { MODE_BEHAVIORS } from "../../code/config";

export type { SystemPromptMode };
export { MODE_BEHAVIORS };

export type ToolFormat = "xml" | "json";

export interface SystemInfo {
  os: string;
  shell: string;
  homeDir: string;
  cwd: string;
  language: string;
}

export interface WorkflowAgentPromptConfig {
  toolFormat: ToolFormat;
  language: string;
  systemInfo: SystemInfo;
  mode?: SystemPromptMode;
  promptLengthMode?: "short" | "medium" | "long" | "full" | "none";
}

export const joinSections = (...sections: (string | null | undefined)[]): string =>
  sections.filter((s): s is string => Boolean(s?.trim())).join("\n\n");