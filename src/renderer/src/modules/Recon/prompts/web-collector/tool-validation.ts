import type { ToolFormat } from '../types';
import { WEB_COLLECTOR_TOOLS } from './tools-reference';

const tick = (text: string): string => '`' + text + '`';

export const buildWebCollectorToolValidation = (toolFormat: ToolFormat = 'xml'): string => {
  const valid = WEB_COLLECTOR_TOOLS.map(tick).join(', ');
  const invented =
    toolFormat === 'json'
      ? [
          '{"tool":"get_content"}      ❌ → use "get_page_content"',
          '{"tool":"click"}            ❌ → use "click_element"',
          '{"tool":"type_text"}        ❌ → use "fill_input"',
          '{"tool":"execute_js"}       ❌ → use "evaluate_js"',
          '{"tool":"take_screenshot"}   ❌ → use "capture_screenshot"',
          '{"tool":"run_command"}       ❌ → this is a WEB COLLECTOR; you have no terminal',
          '{"tool":"create_file"}       ❌ → the synthesizer writes .recon files, not you',
        ]
      : [
          '<get_content>      ❌ → use <get_page_content>',
          '<click>            ❌ → use <click_element>',
          '<type_text>        ❌ → use <fill_input>',
          '<execute_js>       ❌ → use <evaluate_js>',
          '<take_screenshot>  ❌ → use <capture_screenshot>',
          '<run_command>      ❌ → this is a WEB COLLECTOR; you have no terminal',
          '<create_file>      ❌ → the synthesizer writes .recon files, not you',
        ];
  return [
    toolFormat === 'json'
      ? '# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)'
      : '# TOOL VALIDATION & ERROR PREVENTION',
    `Valid tools for the web collector: ${valid}.`,
    'The web collector has NO terminal, NO file tools (read_file, create_file, update_file, list_files, delete_file), NO memory tools. If you need a command or a file write, report it to the orchestrator via send_message.',
    toolFormat === 'json'
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown | question). One object per fenced json block.'
      : 'Tool calls are XML tags only; the UI tags are markdown and question.',
    'Required parameters: click_element → ref. fill_input → ref, value. navigate → url (waitUntil optional). switch_tab → tabId. evaluate_js → script. capture_screenshot → none (fullPage optional). send_message → agent_id (always "orchestrator"), message.',
    '## Common Invented-Tool Mistakes to AVOID\n```\n' + invented.join('\n') + '\n```',
    '## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list\n- [ ] list_tabs / get_page_content / list_elements precede the corresponding action\n- [ ] evaluate_js was NOT run without a prior QUESTION to the orchestrator\n- [ ] send_message uses agent_id "orchestrator"',
  ].join('\n\n');
};