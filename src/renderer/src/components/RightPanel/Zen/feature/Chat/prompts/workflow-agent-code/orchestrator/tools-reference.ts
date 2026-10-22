import type { ToolFormat } from "../shared/types";
import type { ToolName } from "../shared/tool-catalog";
import { buildToolsSection } from "../shared/tool-catalog";

export const ORCHESTRATOR_TOOLS: ToolName[] = [
  "conversation_title",
  "read_file",
  "list_files",
  "find_files",
  "grep",
  "git_status",
  "git_diff",
  "read_skill",
  "read_memory",
  "update_memory",
];

export const buildOrchestratorToolsReference = (
  toolFormat: ToolFormat = "xml",
): string =>
  buildToolsSection(
    ORCHESTRATOR_TOOLS,
    toolFormat,
    "The orchestrator has read-only exploration tools plus memory. It has no write, delete or run_command tools: every change to the codebase is made by the executor.",
  );