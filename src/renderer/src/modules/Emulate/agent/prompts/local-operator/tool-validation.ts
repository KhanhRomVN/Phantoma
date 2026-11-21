import type { ToolFormat } from './types';
import { CLI_TOOL_TOOLS } from './tools-reference';

const tick = (text: string): string => '`' + text + '`';

export const buildCliToolToolValidation = (toolFormat: ToolFormat = 'xml'): string => {
  const valid = CLI_TOOL_TOOLS.map(tick).join(', ');
  const invented =
    toolFormat === 'json'
      ? [
          '{"tool":"exec"}            ❌ → use "run_command"',
          '{"tool":"shell"}           ❌ → use "run_command"',
          '{"tool":"bash"}            ❌ → use "run_command"',
          '{"tool":"write_file"}      ❌ → use "create_file" (only under files/scripts/)',
          '{"tool":"delete_file"}     ❌ → this agent has no delete tool',
          '{"tool":"navigate"}        ❌ → this is the CLI TOOL agent; you have no browser',
          '{"tool":"list_https"}      ❌ → traffic analysis belongs to the analyzer',
        ]
      : [
          '<exec>          ❌ → use <run_command>',
          '<shell>         ❌ → use <run_command>',
          '<bash>          ❌ → use <run_command>',
          '<write_file>    ❌ → use <create_file> (only under files/scripts/)',
          '<delete_file>   ❌ → this agent has no delete tool',
          '<navigate>      ❌ → this is the CLI TOOL agent; you have no browser',
          '<list_https>    ❌ → traffic analysis belongs to the analyzer',
        ];
  return [
    toolFormat === 'json'
      ? '# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)'
      : '# TOOL VALIDATION & ERROR PREVENTION',
    `Valid tools for the CLI tool agent: ${valid}.`,
    'The CLI tool agent has NO browser tools, NO traffic tools and NO delete_file. Its file tools only create/update throwaway scripts under files/scripts/ — it never writes report files.',
    toolFormat === 'json'
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown | question). One object per fenced json block.'
      : 'Tool calls are XML tags only; the UI tags are markdown and question.',
    'Required parameters: run_command → command (folder_path optional). read_file → file_path. list_files → folder_path (optional). create_file → file_path, content. update_file → file_path, old_content, new_content. send_message → agent_id (always "orchestrator"), message.',
    '## Common Invented-Tool Mistakes to AVOID\n```\n' + invented.join('\n') + '\n```',
    '## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list\n- [ ] No sudo/su/doas/rm -rf/curl|bash command is attempted\n- [ ] Throwaway scripts live under files/scripts/, never as report files\n- [ ] send_message uses agent_id "orchestrator"',
  ].join('\n\n');
};