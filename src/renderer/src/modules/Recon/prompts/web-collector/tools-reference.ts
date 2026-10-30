import type { ToolFormat } from '../types';

export type WebCollectorToolName =
  | 'list_tabs'
  | 'create_tab'
  | 'close_tab'
  | 'switch_tab'
  | 'navigate'
  | 'back'
  | 'forward'
  | 'reload'
  | 'get_page_content'
  | 'list_elements'
  | 'list_frames'
  | 'capture_screenshot'
  | 'click_element'
  | 'fill_input'
  | 'clear_input'
  | 'select_option'
  | 'hover'
  | 'upload_file'
  | 'press_key'
  | 'scroll'
  | 'scroll_to_element'
  | 'wait_for'
  | 'evaluate_js'
  | 'send_message';

export const WEB_COLLECTOR_TOOLS: WebCollectorToolName[] = [
  'list_tabs',
  'create_tab',
  'close_tab',
  'switch_tab',
  'navigate',
  'back',
  'forward',
  'reload',
  'get_page_content',
  'list_elements',
  'list_frames',
  'capture_screenshot',
  'click_element',
  'fill_input',
  'clear_input',
  'select_option',
  'hover',
  'upload_file',
  'press_key',
  'scroll',
  'scroll_to_element',
  'wait_for',
  'evaluate_js',
  'send_message',
];

const tick = (text: string): string => '`' + text + '`';

const callText = (name: WebCollectorToolName, params: Record<string, string | number>, format: ToolFormat): string => {
  if (format === 'json') return JSON.stringify({ tool: name, params });
  if (Object.keys(params).length === 0) return `<${name} />`;
  const inner = Object.entries(params).map(([k, v]) => `<${k}>${v}</${k}>`).join('');
  return `<${name}>${inner}</${name}>`;
};

interface ToolDef {
  description: string;
  examples: { params: Record<string, string | number>; note: string }[];
}

const TOOL_DEFS: Record<WebCollectorToolName, ToolDef> = {
  list_tabs: {
    description: 'List open browser tabs with their ids and URLs. Call before any tab action.',
    examples: [{ params: {}, note: 'no parameters' }],
  },
  create_tab: {
    description: 'Open a new tab, optionally navigating to a URL.',
    examples: [{ params: { url: 'https://example.com' }, note: 'open example.com' }],
  },
  close_tab: {
    description: 'Close a tab by tabId.',
    examples: [{ params: { tabId: 'tab-123' }, note: 'close a tab' }],
  },
  switch_tab: {
    description: 'Activate a tab by tabId.',
    examples: [{ params: { tabId: 'tab-123' }, note: 'activate a tab' }],
  },
  navigate: {
    description:
      'Navigate the active (or named) tab to a URL. Use waitUntil=networkidle for SPA content.',
    examples: [
      { params: { url: 'https://example.com', waitUntil: 'networkidle' }, note: 'navigate + wait for network idle' },
    ],
  },
  back: {
    description: 'Browser Back on the active tab.',
    examples: [{ params: {}, note: 'no parameters' }],
  },
  forward: {
    description: 'Browser Forward on the active tab.',
    examples: [{ params: {}, note: 'no parameters' }],
  },
  reload: {
    description: 'Reload the active tab.',
    examples: [{ params: {}, note: 'no parameters' }],
  },
  get_page_content: {
    description:
      'Extract the page as markdown, optionally capped by maxChars. Primary extraction tool.',
    examples: [
      { params: {}, note: 'full page markdown' },
      { params: { maxChars: 8000 }, note: 'cap at 8000 chars' },
    ],
  },
  list_elements: {
    description: 'List interactive elements (links, buttons, inputs) with stable refs.',
    examples: [{ params: {}, note: 'list all interactive elements' }],
  },
  list_frames: {
    description: 'List iframes/frames on the page with their frameIds.',
    examples: [{ params: {}, note: 'list frames' }],
  },
  capture_screenshot: {
    description:
      'Capture a screenshot of the viewport (or full page). High token cost — use sparingly.',
    examples: [
      { params: {}, note: 'viewport screenshot' },
      { params: { fullPage: 'true' }, note: 'full-page screenshot' },
    ],
  },
  click_element: {
    description: 'Click an element by ref.',
    examples: [{ params: { ref: 'btn-login' }, note: 'click by ref' }],
  },
  fill_input: {
    description: 'Clear and type into an input by ref.',
    examples: [{ params: { ref: 'input-q', value: 'example' }, note: 'fill input' }],
  },
  clear_input: {
    description: 'Clear an input by ref (does not type).',
    examples: [{ params: { ref: 'input-q' }, note: 'clear input' }],
  },
  select_option: {
    description: 'Select an option in a <select> by ref.',
    examples: [{ params: { ref: 'select-country', value: 'VN' }, note: 'select option' }],
  },
  hover: {
    description: 'Hover an element by ref (to reveal menus/tooltips).',
    examples: [{ params: { ref: 'menu-settings' }, note: 'hover to open menu' }],
  },
  upload_file: {
    description: 'Upload a file to an input[type=file] by ref.',
    examples: [{ params: { ref: 'input-file', file_path: 'files/upload.txt' }, note: 'upload a file' }],
  },
  press_key: {
    description: 'Press a keyboard key on the focused element (or page).',
    examples: [{ params: { key: 'Enter' }, note: 'press Enter' }],
  },
  scroll: {
    description: 'Scroll the page by direction/amount.',
    examples: [{ params: { direction: 'down', amount: 800 }, note: 'scroll down' }],
  },
  scroll_to_element: {
    description: 'Scroll directly to an element by ref.',
    examples: [{ params: { ref: 'section-pricing' }, note: 'scroll to element' }],
  },
  wait_for: {
    description:
      'Wait for a condition (selector, network idle, timeout) before continuing.',
    examples: [
      { params: { condition: 'networkidle', timeoutMs: 10000 }, note: 'wait for network idle' },
    ],
  },
  evaluate_js: {
    description:
      'Run JavaScript in page context and return the serializable result. ASK the orchestrator first.',
    examples: [
      { params: { script: 'return document.title;' }, note: 'read the page title' },
    ],
  },
  send_message: {
    description:
      'Reply to the orchestrator. Required: agent_id (always "orchestrator") and message (a self-contained TYPE: RESULT|QUESTION with STATUS and BODY).',
    examples: [
      {
        params: {
          agent_id: 'orchestrator',
          message: 'TYPE: RESULT\nSTATUS: OK\nBODY:\nSOURCE URL: ...\nFIELDS:\n- ...',
        },
        note: 'send the RESULT back',
      },
    ],
  },
};

export const buildWebCollectorToolsReference = (toolFormat: ToolFormat = 'xml'): string => {
  const how =
    toolFormat === 'json'
      ? 'Every tool call is one JSON object in its own fenced json block: ' +
        tick('{"tool":"<name>","params":{...}}') +
        '.'
      : 'Every tool call is one XML tag, for example ' + tick('<list_tabs />') + '.';
  const docs = WEB_COLLECTOR_TOOLS.map((tool) => {
    const def = TOOL_DEFS[tool];
    const examples = def.examples
      .map((e) => `  - ${tick(callText(tool, e.params, toolFormat))} — ${e.note}`)
      .join('\n');
    return `**${tool}**: ${def.description}\n${examples}`;
  }).join('\n');
  const jsonNote =
    'JSON-STRINGS: escape every newline as backslash + n and every double quote as backslash + double quote. One object per fenced json block.';
  return [
    toolFormat === 'json' ? '# TOOLS (JSON FORMAT)' : '# TOOLS',
    'The web collector drives the browser through 23 read-only/interactive tools plus send_message. It has NO terminal, NO file tools (read_file, create_file, update_file), NO memory tools.',
    how,
    toolFormat === 'json' ? jsonNote : '',
    docs,
  ].join('\n\n');
};