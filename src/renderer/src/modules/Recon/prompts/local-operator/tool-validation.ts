import type { ToolFormat } from '../types';
import { LOCAL_OPERATOR_TOOLS } from './tools-reference';

const tick = (text: string): string => '`' + text + '`';

export const buildLocalOperatorToolValidation = (toolFormat: ToolFormat = 'xml'): string => {
  const valid = LOCAL_OPERATOR_TOOLS.map(tick).join(', ');
  const invented =
    toolFormat === 'json'
      ? [
          '{"tool":"exec"}            ❌ → use "run_command"',
          '{"tool":"shell"}           ❌ → use "run_command"',
          '{"tool":"bash"}            ❌ → use "run_command"',
          '{"tool":"write_file"}      ❌ → use "create_file" (only under files/scripts/)',
          '{"tool":"delete_file"}     ❌ → this operator has no delete tool',
          '{"tool":"navigate"}        ❌ → this is a LOCAL OPERATOR; you have no browser',
        ]
      : [
          '<exec>          ❌ → use <run_command>',
          '<shell>         ❌ → use <run_command>',
          '<bash>          ❌ → use <run_command>',
          '<write_file>    ❌ → use <create_file> (only under files/scripts/)',
          '<delete_file>   ❌ → this operator has no delete tool',
          '<navigate>      ❌ → this is a LOCAL OPERATOR; you have no browser',
        ];
  return [
    toolFormat === 'json'
      ? '# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)'
      : '# TOOL VALIDATION & ERROR PREVENTION',
    `Valid tools for the local operator: ${valid}.`,
    'The local operator has NO browser tools and NO delete_file. Its file tools only create/update throwaway scripts under files/scripts/ — it never writes .recon files.',
    toolFormat === 'json'
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown | question). One object per fenced json block.'
      : 'Tool calls are XML tags only; the UI tags are markdown and question.',
    'Required parameters: run_command → command (folder_path optional). read_file → file_path. list_files → folder_path (optional). create_file → file_path, content. update_file → file_path, old_content, new_content. send_message → agent_id (always "orchestrator"), message.',
    '## Common Invented-Tool Mistakes to AVOID\n```\n' + invented.join('\n') + '\n```',
    '## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list\n- [ ] No sudo/su/doas/rm -rf/curl|bash command is attempted\n- [ ] throwaway scripts live under files/scripts/, never as .recon files\n- [ ] send_message uses agent_id "orchestrator"',
  ].join('\n\n');
};