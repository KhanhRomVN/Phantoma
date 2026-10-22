import type { ToolFormat } from "../shared/types";
import type { ToolName } from "../shared/tool-catalog";
import { buildToolsSection } from "../shared/tool-catalog";

export const REVIEWER_TOOLS: ToolName[] = [
  "read_file",
  "list_files",
  "find_files",
  "grep",
  "git_status",
  "git_diff",
  "run_command",
  "view_replace_history",
  "read_skill",
];

export const buildReviewerToolsReference = (
  toolFormat: ToolFormat = "xml",
): string =>
  buildToolsSection(
    REVIEWER_TOOLS,
    toolFormat,
    "The reviewer has read-only inspection tools plus run_command, which may be used ONLY for non-mutating checks (type check, lint, existing tests, build). It has no write, delete, revert or memory tools.",
  );