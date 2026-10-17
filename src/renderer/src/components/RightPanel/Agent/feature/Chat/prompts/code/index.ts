import { buildPromptForMode } from "./prompt-modes";
import type { SystemPromptMode, PromptModeConfig } from "./prompt-modes";

export { buildIdentityPrompt } from "./identity";
export { buildWorkflow } from "./workflow";
export { TOOLS_REFERENCE } from "./tools-reference";
export { buildSystemContext } from "./system-context";
export type { SystemInfo } from "./system-context";
export { buildConstraints } from "./constraints";
export { TOOL_VALIDATION } from "./tool-validation";
// EXAMPLE used to be a plain constant; it is now mode-aware (see example.ts)
// so it is exported as a builder function instead.
export { buildExample } from "./example";
export { buildAgentsMdSection } from "./agents-md";
export { buildClaudePrompt } from "./claude-system-prompt";
export type { ClaudePromptConfig } from "./claude-system-prompt";
export { buildPromptForMode } from "./prompt-modes";
export type {
  SystemPromptMode,
  PromptModeConfig,
  PromptLengthMode,
} from "./prompt-modes";
export { MODE_BEHAVIORS } from "./mode-config";
export type { ModeBehaviorConfig } from "./mode-config";

interface PromptConfig {
  language: string;
  systemInfo: import("./system-context").SystemInfo;
  /** Optional — Phantoma PromptBuilder truyền vào nhưng code prompt không dùng. */
  permissionMode?: string;
  /** Which sections of the prompt to include. Default: 'long' (full). */
  promptLengthMode?: import("./mode-config").PromptLengthMode;
  /** Tool output format — 'xml' (default) or 'json'. */
  toolFormat?: "xml" | "json";
}

/**
 * Build system prompt cho mode balanced (mặc định).
 */
export const combinePrompts = (config: PromptConfig): string => {
  return buildPromptForMode(
    {
      language: config.language,
      systemInfo: config.systemInfo,
      promptLengthMode: config.promptLengthMode,
      toolFormat: config.toolFormat,
    },
    "balanced",
  );
};

/**
 * Backward-compat: Phantoma PromptBuilder import getDefaultPrompt từ đây.
 */
export const getDefaultPrompt = (language: string = "English"): string => {
  return combinePrompts({
    language,
    systemInfo: {
      os: "Unknown OS",
      shell: "unknown",
      homeDir: "~",
      cwd: ".",
      language,
    },
  });
};

/**
 * Build system prompt theo mode.
 */
export const combinePromptsForMode = (
  config: PromptModeConfig,
  mode: SystemPromptMode,
): string => {
  return buildPromptForMode(config, mode);
};
