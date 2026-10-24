import type { SystemPromptMode } from "@renderer/modules/Code/prompts/code/mode-config";
import type { SystemInfo } from "@renderer/modules/Code/prompts/code/system-context";
import { buildSystemContext } from "@renderer/modules/Code/prompts/code/system-context";

export const buildExecutorSystemContext = (
  info: SystemInfo,
  mode: SystemPromptMode = "balanced",
): string => buildSystemContext(info, mode);