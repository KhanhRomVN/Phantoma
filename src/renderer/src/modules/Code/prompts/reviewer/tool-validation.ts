import type { ToolFormat } from "../code/mode-config";
import type { ReviewerToolName } from "./tools-reference";
import { REVIEWER_TOOLS, tick } from "./tools-reference";

const ALL_TOOLS: ReviewerToolName[] = [
  "read_file",
  "list_files",
  "find_files",
  "grep",
  "git_status",
  "git_diff",
  "run_command",
  "view_replace_history",
  "read_skill",
  "send_message",
];

const nameList = (names: ReviewerToolName[]): string => names.map(tick).join(", ");

export const buildReviewerToolValidation = (
  toolFormat: ToolFormat = "xml",
): string => {
  const forbidden = ALL_TOOLS.filter((tool) => !REVIEWER_TOOLS.includes(tool));
  const forbiddenLine =
    forbidden.length > 0
      ? `Tools that exist in this application but are NOT available to the reviewer: ${nameList(forbidden)}. Never emit them; if you need something only they can do, ask for it via send_to_agent to orchestrator.`
      : "";
  const shapeRules =
    toolFormat === "json"
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown | code). One object per fenced json block. Zero XML anywhere.'
      : "Tool calls are XML tags only; UI tags are markdown and code. Never wrap an XML tool call in a json fence.";
  return [
    toolFormat === "json"
      ? "# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)"
      : "# TOOL VALIDATION & ERROR PREVENTION",
    `Valid tools for the reviewer (case-sensitive, lowercase with underscores): ${nameList(REVIEWER_TOOLS)}.`,
    forbiddenLine,
    shapeRules,
    "Invented names such as search_files, edit_file, create_file or get_file do not exist: use the real tool from the valid list.",
    "## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list for this role\n- [ ] Every tool has its required parameters\n- [ ] The block syntax matches the tool format exactly\n- [ ] No tool outside this role's list is used",
    "If you notice an invalid call: stop, pick the correct tool from the valid list, rewrite it, and re-check every other call in the response.",
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
};