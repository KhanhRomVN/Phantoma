import type { ToolFormat } from './types';
import { PLANNER_TOOLS } from './tools-reference';

const tick = (text: string): string => '`' + text + '`';

export const buildPlannerToolValidation = (toolFormat: ToolFormat = 'xml'): string => {
  const valid = PLANNER_TOOLS.map(tick).join(', ');
  const invented =
    toolFormat === 'json'
      ? [
          '{"tool":"navigate"}      ❌ → describe it in STEPS instead',
          '{"tool":"run_command"}   ❌ → describe it in STEPS instead',
          '{"tool":"list_https"}    ❌ → describe it in STEPS instead',
          '{"tool":"create_file"}   ❌ → describe it in STEPS instead',
          '{"tool":"send_to_agent"} ❌ → use "send_message"',
        ]
      : [
          '<navigate>      ❌ → describe it in STEPS instead',
          '<run_command>   ❌ → describe it in STEPS instead',
          '<list_https>    ❌ → describe it in STEPS instead',
          '<create_file>   ❌ → describe it in STEPS instead',
          '<send_to_agent> ❌ → use <send_message>',
        ];
  return [
    toolFormat === 'json'
      ? '# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)'
      : '# TOOL VALIDATION & ERROR PREVENTION',
    `Valid tools for the planner: ${valid}.`,
    'The planner has NO browser, terminal, traffic, create_file or update_file tools. Operation steps belong in STEPS, not in tool calls.',
    toolFormat === 'json'
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown | question). One object per fenced json block.'
      : 'Tool calls are XML tags only; the UI tags are markdown and question.',
    'Required parameters: read_file → file_path. list_files → folder_path (optional), depth (optional). send_message → agent_id (always "orchestrator"), message.',
    '## Common Invented-Tool Mistakes to AVOID\n```\n' + invented.join('\n') + '\n```',
    '## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list\n- [ ] send_message uses agent_id "orchestrator"\n- [ ] The PLAN follows the exact PLAN format\n- [ ] No browser/terminal/traffic/file-write tool is used',
  ].join('\n\n');
};