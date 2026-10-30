import type { ToolFormat } from '../types';
import { VERIFIER_TOOLS } from './tools-reference';

const tick = (text: string): string => '`' + text + '`';

export const buildVerifierToolValidation = (toolFormat: ToolFormat = 'xml'): string => {
  const valid = VERIFIER_TOOLS.map(tick).join(', ');
  const invented =
    toolFormat === 'json'
      ? [
          '{"tool":"navigate"}        ❌ → this is the VERIFIER; collection is not your job',
          '{"tool":"run_command"}     ❌ → this is the VERIFIER; no terminal',
          '{"tool":"create_file"}     ❌ → the synthesizer writes .recon files',
          '{"tool":"update_file"}     ❌ → the synthesizer writes .recon files',
          '{"tool":"send_to_agent"}   ❌ → use "send_message"',
        ]
      : [
          '<navigate>      ❌ → this is the VERIFIER; collection is not your job',
          '<run_command>   ❌ → this is the VERIFIER; no terminal',
          '<create_file>   ❌ → the synthesizer writes .recon files',
          '<update_file>   ❌ → the synthesizer writes .recon files',
          '<send_to_agent> ❌ → use <send_message>',
        ];
  return [
    toolFormat === 'json'
      ? '# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)'
      : '# TOOL VALIDATION & ERROR PREVENTION',
    `Valid tools for the verifier: ${valid}.`,
    'The verifier has NO browser, terminal, create_file, update_file or delete_file tools. It reads existing .recon files and judges the orchestrator-supplied results.',
    toolFormat === 'json'
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown | question). One object per fenced json block.'
      : 'Tool calls are XML tags only; the UI tags are markdown and question.',
    'Required parameters: read_file → file_path. list_files → folder_path (optional), depth (optional). send_message → agent_id (always "orchestrator"), message.',
    '## Common Invented-Tool Mistakes to AVOID\n```\n' + invented.join('\n') + '\n```',
    '## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list\n- [ ] Every VERIFIED line cites ≥2 independent source URLs\n- [ ] Every UNVERIFIED / CONTRADICTION line cites at least one source or explains why none is possible\n- [ ] send_message uses agent_id "orchestrator"',
  ].join('\n\n');
};