import type { ToolFormat } from "../shared/types";
import type { ToolName } from "../shared/tool-catalog";
import { buildToolsSection } from "../shared/tool-catalog";

export const PLANNER_TOOLS: ToolName[] = [
  "read_file",
  "list_files",
  "find_files",
  "grep",
  "git_status",
  "git_diff",
  "read_skill",
];

export const buildPlannerToolsReference = (
  toolFormat: ToolFormat = "xml",
): string =>
  buildToolsSection(
    PLANNER_TOOLS,
    toolFormat,
    "The planner has read-only exploration tools. It has no write, delete, run_command or memory tools, and it does not set the conversation title.",
  );