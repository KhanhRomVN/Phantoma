import type { ToolFormat } from "../code/mode-config";
import { PLANNER_TOOLS, tick } from "./tools-reference";

export const buildPlannerToolValidation = (
  toolFormat: ToolFormat = "xml",
): string => {
  const valid = PLANNER_TOOLS.map(tick).join(", ");
  const shapeRules =
    toolFormat === "json"
      ? 'Only one legal shape: a tool call (top-level "tool" key with "params"). One object per fenced json block. Zero XML anywhere.'
      : "Tool calls are XML tags only. Never wrap an XML tool call in a json fence.";
  return [
    toolFormat === "json"
      ? "# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)"
      : "# TOOL VALIDATION & ERROR PREVENTION",
    `Valid tools for the planner (case-sensitive, lowercase with underscores): ${valid}.`,
    "The planner has NO write_to_file, replace_in_file, delete_file, revert_file, git_status, git_diff, commit_message, read_skill, memory or conversation_title tools. Never emit them. For git state use run_command with a read-only git command; for anything that must change, put it in the PLAN for the executor.",
    shapeRules,
    "send_message requires agent_id (always orchestrator) and message, and is the LAST call of a turn.",
    "## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list\n- [ ] Every tool has its required parameters\n- [ ] The block syntax matches the tool format exactly\n- [ ] run_command is used for inspection only\n- [ ] send_to_agent targets orchestrator and comes last",
  ].join("\n\n");
};