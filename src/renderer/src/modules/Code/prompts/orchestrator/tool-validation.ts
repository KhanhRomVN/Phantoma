import type { ToolFormat } from "../code/mode-config";
import { ORCHESTRATOR_TOOLS, tick } from "./tools-reference";

export const buildOrchestratorToolValidation = (
  toolFormat: ToolFormat = "xml",
): string => {
  const valid = ORCHESTRATOR_TOOLS.map(tick).join(", ");
  const shapeRules =
    toolFormat === "json"
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown). One object per fenced json block. Zero XML anywhere.'
      : "Tool calls are XML tags only; the UI tag is markdown. Never wrap an XML tool call in a json fence.";
  return [
    toolFormat === "json"
      ? "# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)"
      : "# TOOL VALIDATION & ERROR PREVENTION",
    `Valid tools for the orchestrator (case-sensitive, lowercase with underscores): ${valid}.`,
    "The orchestrator has NO read_file, write_to_file, replace_in_file, list_files, find_files, grep, run_command, git or memory tools. Never emit them; if you need code, files or command output, ask the right sub-agent through send_message.",
    shapeRules,
    "send_message requires agent_id (the snake_case id from create_agent) and message. create_agent requires agent_type (executor|planner|reviewer), agent_name, provider_id, model_id, account_id. list_agents takes no parameters.",
    "## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list\n- [ ] Every tool has its required parameters\n- [ ] The block syntax matches the tool format exactly\n- [ ] No file, command or memory tool is used",
  ].join("\n\n");
};