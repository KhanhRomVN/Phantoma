import type { ToolFormat } from "../code/mode-config";
import type { ReviewerToolName } from "./tools-reference";
import {
  HANDOFF_AGENT,
  HANDOFF_TOOL,
  REVIEWER_TOOLS,
  tick,
} from "./tools-reference";

const nameList = (names: ReviewerToolName[]): string => names.map(tick).join(", ");

export const buildReviewerToolValidation = (
  toolFormat: ToolFormat = "xml",
): string => {
  const delivery = `The review is delivered only through ${tick(HANDOFF_TOOL)} with agent_id ${HANDOFF_AGENT}, never as a free-standing message.`;
  const shapeRules =
    toolFormat === "json"
      ? `Every tool call is one JSON object with a top-level "tool" key and a "params" object, in its own fenced json block. Zero XML anywhere. ${delivery}`
      : `Every tool call is one XML tag. Never wrap an XML tool call in a json fence. ${delivery}`;
  return [
    toolFormat === "json"
      ? "# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)"
      : "# TOOL VALIDATION & ERROR PREVENTION",
    `Valid tools for the reviewer (case-sensitive, lowercase with underscores): ${nameList(REVIEWER_TOOLS)}.`,
    shapeRules,
    "Write tools (write_to_file, replace_in_file, delete_file) and invented names such as search_files, edit_file, create_file or get_file are not available: use a real tool from the valid list.",
    "## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list for this role\n- [ ] Every tool has its required parameters\n- [ ] The block syntax matches the tool format exactly\n- [ ] The review is sent with the handoff tool as the last call",
    "If you notice an invalid call: stop, pick the correct tool from the valid list, rewrite it, and re-check every other call in the response.",
  ].join("\n\n");
};