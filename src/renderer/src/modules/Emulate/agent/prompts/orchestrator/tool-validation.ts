import type { ToolFormat } from './types';
import { ORCHESTRATOR_TOOLS, EMULATE_AGENT_TYPES, tick } from './tools-reference';

// Tool validation — built by format at runtime.
export const buildOrchestratorToolValidation = (toolFormat: ToolFormat = 'xml'): string => {
  const valid = ORCHESTRATOR_TOOLS.map(tick).join(', ');
  const agentTypes = EMULATE_AGENT_TYPES.map(tick).join(', ');
  const shapeRules =
    toolFormat === 'json'
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown | question). One object per fenced json block. Zero XML anywhere.'
      : 'Tool calls are XML tags only; the UI tags are markdown and question. Never wrap an XML tool call in a json fence.';
  const invented =
    toolFormat === 'json'
      ? [
          '{"tool":"send_to_agent"}   ❌ → use "send_message"',
          '{"tool":"spawn_agent"}     ❌ → use "create_agent"',
          '{"tool":"remove_agent"}    ❌ → use "delete_agent"',
          '{"tool":"get_agents"}      ❌ → use "list_agents"',
          '{"tool":"navigate"}        ❌ → send_message to an emulate_browser agent',
          '{"tool":"run_command"}     ❌ → send_message to an emulate_cli agent',
          '{"tool":"list_https"}      ❌ → send_message to an emulate_analyzer agent',
          '{"tool":"run_fuzzer"}    ❌ → send_message to an emulate_analyzer agent',
          '{"tool":"markdown"}        ❌ → use {"type":"markdown","content":"..."}',
        ]
      : [
          '<send_to_agent>  ❌ → use <send_message>',
          '<spawn_agent>    ❌ → use <create_agent>',
          '<remove_agent>   ❌ → use <delete_agent>',
          '<get_agents>     ❌ → use <list_agents>',
          '<navigate>       ❌ → send_message to an emulate_browser agent',
          '<run_command>    ❌ → send_message to an emulate_cli agent',
          '<list_https>     ❌ → send_message to an emulate_analyzer agent',
          '<run_fuzzer>   ❌ → send_message to an emulate_analyzer agent',
        ];
  return [
    toolFormat === 'json'
      ? '# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)'
      : '# TOOL VALIDATION & ERROR PREVENTION',
    `Valid tools for the orchestrator (case-sensitive, lowercase with underscores): ${valid}.`,
    `Valid agent_type values for create_agent: ${agentTypes}.`,
    'The orchestrator has NO browser (navigate, click_element...), NO terminal (run_command), NO traffic tools (list_https, get_https_detail, run_fuzzer...), NO generic file tools and NO memory tools. Never emit them; if you need browsing, a command, traffic analysis or fuzzing, delegate it through send_message to the matching emulate agent.',
    shapeRules,
    'Required parameters: send_message → agent_id, message. create_agent → agent_id (snake_case, unique), agent_type, agent_name. delete_agent → agent_id (a sub-agent id from list_agents, never the orchestrator). list_agents → none. conversation_title → title. create_report → content. read_report → report_id (start_line, end_line optional). update_report → report_id (content, title optional). list_reports → none. Never pass provider_id, model_id or account_id.',
    '## Common Invented-Tool Mistakes to AVOID\n```\n' + invented.join('\n') + '\n```',
    '## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list\n- [ ] Every tool has its required parameters\n- [ ] agent_type is one of the emulate agent types listed above\n- [ ] list_reports precedes read_report / update_report\n- [ ] No browser, terminal or traffic tool is used\n- [ ] No send_message shares a turn with the create_agent for its target',
  ].join('\n\n');
};