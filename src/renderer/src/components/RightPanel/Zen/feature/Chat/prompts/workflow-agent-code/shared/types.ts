import type { SystemInfo } from "../../code/system-context";
import type {
  SystemPromptMode,
  PromptLengthMode,
} from "../../code/mode-config";

export type ToolFormat = "xml" | "json";

export type WorkflowAgentRole =
  | "orchestrator"
  | "planner"
  | "reviewer"
  | "executor";

export interface WorkflowAgentPromptConfig {
  language: string;
  systemInfo: SystemInfo;
  promptLengthMode?: PromptLengthMode;
  toolFormat?: ToolFormat;
  mode?: SystemPromptMode;
}

export const joinSections = (sections: string[]): string =>
  sections.filter((section) => section.length > 0).join("\n\n---\n\n");