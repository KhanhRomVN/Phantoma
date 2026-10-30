import type { ToolFormat } from '../types';
import { ORCHESTRATOR_TOOLS, RECON_AGENT_TYPES, tick } from './tools-reference';

export const buildOrchestratorToolValidation = (
  toolFormat: ToolFormat = 'xml',
): string => {
  const valid = ORCHESTRATOR_TOOLS.map(tick).join(', ');
  const agentTypes = RECON_AGENT_TYPES.map(tick).join(', ');
  const shapeRules =
    toolFormat === 'json'
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown | question). One object per fenced json block. Zero XML anywhere.'
      : 'Tool calls are XML tags only; the UI tags are markdown and question. Never wrap an XML tool call in a json fence.';
  const invented =
    toolFormat === 'json'
      ? [
          '{"tool":"send_to_agent"}   ❌ → use "send_message"',
          '{"tool":"spawn_agent"}      ❌ → use "create_agent"',
          '{"tool":"remove_agent"}     ❌ → use "delete_agent"',
          '{"tool":"get_agents"}       ❌ → use "list_agents"',
          '{"tool":"navigate"}         ❌ → send_message to a recon_web agent',
          '{"tool":"run_command"}      ❌ → send_message to a recon_local agent',
          '{"tool":"create_file"}      ❌ → send_message to a recon_synthesizer agent',
          '{"tool":"markdown"}         ❌ → use {"type":"markdown","content":"..."}',
        ]
      : [
          '<send_to_agent>  ❌ → use <send_message>',
          '<spawn_agent>    ❌ → use <create_agent>',
          '<remove_agent>   ❌ → use <delete_agent>',
          '<get_agents>     ❌ → use <list_agents>',
          '<navigate>       ❌ → send_message to a recon_web agent',
          '<run_command>    ❌ → send_message to a recon_local agent',
          '<create_file>    ❌ → send_message to a recon_synthesizer agent',
        ];
  return [
    toolFormat === 'json'
      ? '# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)'
      : '# TOOL VALIDATION & ERROR PREVENTION',
    `Valid tools for the orchestrator (case-sensitive, lowercase with underscores): ${valid}.`,
    `Valid agent_type values for create_agent: ${agentTypes}.`,
    'The orchestrator has NO browser (navigate, click_element, get_page_content...), NO terminal (run_command), NO file (.recon, create_file, update_file) and NO memory tools. Never emit them; if you need collection, a command or a file write, delegate it through send_message to the matching recon agent.',
    shapeRules,
    'Required parameters: send_message → agent_id, message. create_agent → agent_id (snake_case, unique), agent_type, agent_name. delete_agent → agent_id (a sub-agent id from list_agents, never the orchestrator). list_agents → none. conversation_title → title. Never pass provider_id, model_id or account_id.',
    '## Common Invented-Tool Mistakes to AVOID\n```\n' + invented.join('\n') + '\n```',
    '## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list\n- [ ] Every tool has its required parameters\n- [ ] agent_type is one of the recon agent types listed above\n- [ ] No browser, terminal or file tool is used\n- [ ] No send_message shares a turn with the create_agent for its target',
  ].join('\n\n');
};