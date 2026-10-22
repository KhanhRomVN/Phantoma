import type { ToolFormat } from "../shared/types";
import type { ToolName } from "../shared/tool-catalog";
import { buildToolsSection } from "../shared/tool-catalog";

export const EXECUTOR_TOOLS: ToolName[] = [
  "read_file",
  "write_to_file",
  "replace_in_file",
  "list_files",
  "find_files",
  "grep",
  "delete_file",
  "run_command",
  "git_status",
  "git_diff",
  "commit_message",
  "revert_file",
  "view_replace_history",
  "read_skill",
];

export const buildExecutorToolsReference = (
  toolFormat: ToolFormat = "xml",
): string =>
  buildToolsSection(
    EXECUTOR_TOOLS,
    toolFormat,
    "The executor has the full file and command toolset. It has no memory tools and does not set the conversation title (the orchestrator does).",
  );