import type { ToolFormat } from '../types';
import { SYNTHESIZER_TOOLS } from './tools-reference';

const tick = (text: string): string => '`' + text + '`';

export const buildSynthesizerToolValidation = (toolFormat: ToolFormat = 'xml'): string => {
  const valid = SYNTHESIZER_TOOLS.map(tick).join(', ');
  const invented =
    toolFormat === 'json'
      ? [
          '{"tool":"write_file"}      ❌ → use "create_file"',
          '{"tool":"append_file"}     ❌ → use "update_file"',
          '{"tool":"delete_file"}     ❌ → this synthesizer has no delete tool',
          '{"tool":"navigate"}        ❌ → this is the SYNTHESIZER; you do not browse',
          '{"tool":"run_command"}     ❌ → this is the SYNTHESIZER; you do not run commands',
          '{"tool":"verify"}          ❌ → the verifier verifies; you only write',
        ]
      : [
          '<write_file>      ❌ → use <create_file>',
          '<append_file>     ❌ → use <update_file>',
          '<delete_file>     ❌ → this synthesizer has no delete tool',
          '<navigate>        ❌ → this is the SYNTHESIZER; you do not browse',
          '<run_command>     ❌ → this is the SYNTHESIZER; you do not run commands',
          '<verify>          ❌ → the verifier verifies; you only write',
        ];
  return [
    toolFormat === 'json'
      ? '# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)'
      : '# TOOL VALIDATION & ERROR PREVENTION',
    `Valid tools for the synthesizer: ${valid}.`,
    'The synthesizer has NO browser, terminal, delete_file or verification tool. It only reads, lists, creates and updates .recon files, and reports back to the orchestrator.',
    toolFormat === 'json'
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown | question). One object per fenced json block.'
      : 'Tool calls are XML tags only; the UI tags are markdown and question.',
    'Required parameters: read_file → file_path. list_files → folder_path (optional), depth (optional). create_file → file_path, content. update_file → file_path, old_content, new_content. send_message → agent_id (always "orchestrator"), message.',
    '## Common Invented-Tool Mistakes to AVOID\n```\n' + invented.join('\n') + '\n```',
    '## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list\n- [ ] Every create_file / update_file targets a .recon file or a file under files/ — never a source file of the app\n- [ ] Every new .recon file starts with the frontmatter block\n- [ ] Every {src=S-xxx} citation matches a source id that appears in the REVIEW\n- [ ] send_message uses agent_id "orchestrator"',
  ].join('\n\n');
};