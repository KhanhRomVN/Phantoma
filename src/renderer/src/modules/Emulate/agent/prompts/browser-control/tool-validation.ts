import type { ToolFormat } from './types';
import { BROWSER_CONTROL_TOOLS } from './tools-reference';

const tick = (text: string): string => '`' + text + '`';

// Tool validation — built by format at runtime.
export const buildBrowserControlToolValidation = (toolFormat: ToolFormat = 'xml'): string => {
  const valid = BROWSER_CONTROL_TOOLS.map(tick).join(', ');
  const invented =
    toolFormat === 'json'
      ? [
          '{"tool":"get_content"}      ❌ → use "get_page_content"',
          '{"tool":"click"}            ❌ → use "click_element"',
          '{"tool":"type_text"}        ❌ → use "fill_input"',
          '{"tool":"execute_js"}       ❌ → use "evaluate_js"',
          '{"tool":"take_screenshot"}  ❌ → use "capture_screenshot"',
          '{"tool":"list_https"}       ❌ → the analyzer agent reads traffic, not you',
          '{"tool":"run_command"}      ❌ → this is the BROWSER CONTROL agent; you have no terminal',
          '{"tool":"create_report"}    ❌ → the orchestrator writes reports, not you',
        ]
      : [
          '<get_content>      ❌ → use <get_page_content>',
          '<click>            ❌ → use <click_element>',
          '<type_text>        ❌ → use <fill_input>',
          '<execute_js>       ❌ → use <evaluate_js>',
          '<take_screenshot>  ❌ → use <capture_screenshot>',
          '<list_https>       ❌ → the analyzer agent reads traffic, not you',
          '<run_command>      ❌ → this is the BROWSER CONTROL agent; you have no terminal',
          '<create_report>    ❌ → the orchestrator writes reports, not you',
        ];
  return [
    toolFormat === 'json'
      ? '# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)'
      : '# TOOL VALIDATION & ERROR PREVENTION',
    `Valid tools for the browser control agent: ${valid}.`,
    'The browser control agent has NO terminal, NO file tools (read_file, create_file, update_file, list_files, delete_file), NO traffic tools (list_https, get_https_detail...), NO report tools and NO memory tools. If you need one of those, report it to the orchestrator via send_message.',
    toolFormat === 'json'
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown | question). One object per fenced json block.'
      : 'Tool calls are XML tags only; the UI tags are markdown and question.',
    'Required parameters: click_element → ref. fill_input → ref, value. navigate → url (waitUntil optional). switch_tab → tabId. evaluate_js → script. capture_screenshot → none (fullPage optional). send_message → agent_id (always "orchestrator"), message.',
    '## Common Invented-Tool Mistakes to AVOID\n```\n' + invented.join('\n') + '\n```',
    '## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list\n- [ ] list_tabs / get_page_content / list_elements precede the corresponding action\n- [ ] evaluate_js was NOT run without a prior QUESTION to the orchestrator\n- [ ] send_message uses agent_id "orchestrator"',
  ].join('\n\n');
};