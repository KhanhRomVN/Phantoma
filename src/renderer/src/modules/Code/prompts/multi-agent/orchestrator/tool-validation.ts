import type { ToolFormat } from "./types";
import { ORCHESTRATOR_TOOLS, tick } from "./tools-reference";

export const buildOrchestratorToolValidation = (
  toolFormat: ToolFormat = "xml",
): string => {
  const valid = ORCHESTRATOR_TOOLS.map(tick).join(", ");
  const shapeRules =
    toolFormat === "json"
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown | question). One object per fenced json block. Zero XML anywhere.'
      : "Tool calls are XML tags only; the UI tags are markdown and question. Never wrap an XML tool call in a json fence.";
  const invented =
    toolFormat === "json"
      ? [
          '{"tool":"send_to_agent"}  ❌ → use "send_message"',
          '{"tool":"assign_agent"}   ❌ → use "send_message"',
          '{"tool":"spawn_agent"}    ❌ → use "create_agent"',
          '{"tool":"remove_agent"}   ❌ → use "delete_agent"',
          '{"tool":"get_agents"}     ❌ → use "list_agents"',
          '{"tool":"read_file"}      ❌ → send_message to an agent',
          '{"tool":"markdown"}       ❌ → use {"type":"markdown","content":"..."}',
          '{"tool":"question"}       ❌ → use {"type":"question","questions":[...]}',
        ]
      : [
          "<send_to_agent>  ❌ → use <send_message>",
          "<assign_agent>   ❌ → use <send_message>",
          "<spawn_agent>    ❌ → use <create_agent>",
          "<remove_agent>   ❌ → use <delete_agent>",
          "<get_agents>     ❌ → use <list_agents>",
          "<read_file>      ❌ → send_message to an agent",
        ];
  return [
    toolFormat === "json"
      ? "# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)"
      : "# TOOL VALIDATION & ERROR PREVENTION",
    `Valid tools for the orchestrator (case-sensitive, lowercase with underscores): ${valid}.`,
    "The orchestrator has NO read_file, write_to_file, replace_in_file, list_files, find_files, grep, run_command, git or memory tools. Never emit them; if you need code, files or command output, ask the right sub-agent through send_message.",
    shapeRules,
    "Required parameters: send_message → agent_id, message. create_agent → agent_id (snake_case, unique), agent_type (executor|planner|reviewer), agent_name. delete_agent → agent_id (a sub-agent id from list_agents, never the orchestrator). list_agents → none. conversation_title → title. list_tasks → none (optional status). get_task, assign_task, get_workflow → task_id. create_task → title (optional description, priority, due_date). update_task → task_id plus at least one field. create_workflow → task_id, content. update_workflow → task_id, old_content, new_content. Never pass provider_id, model_id or account_id.",
    "## Common Invented-Tool Mistakes to AVOID\n```\n" + invented.join("\n") + "\n```",
    "## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list\n- [ ] Every tool has its required parameters\n- [ ] The block syntax matches the tool format exactly\n- [ ] No file, command or memory tool is used\n- [ ] No send_message shares a turn with the create_agent for its target",
  ].join("\n\n");
};