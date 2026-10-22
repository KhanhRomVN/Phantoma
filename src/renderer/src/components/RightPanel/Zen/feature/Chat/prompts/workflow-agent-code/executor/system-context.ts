import type { SystemPromptMode } from "../../code/mode-config";
import type { SystemInfo } from "../../code/system-context";
import { buildSystemContext } from "../../code/system-context";

export const buildExecutorSystemContext = (
  info: SystemInfo,
  mode: SystemPromptMode = "balanced",
): string => buildSystemContext(info, mode);