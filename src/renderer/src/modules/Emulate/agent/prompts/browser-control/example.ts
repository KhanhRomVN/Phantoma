import type { ToolFormat } from './types';

const fenceCall = (
  format: ToolFormat,
  name: string,
  params: Record<string, string | number>,
): string =>
  format === 'json'
    ? '```json\n' + JSON.stringify({ tool: name, params }) + '\n```'
    : '```xml\n' +
      (Object.keys(params).length === 0
        ? `<${name} />`
        : `<${name}>${Object.entries(params)
            .map(([k, v]) => `<${k}>${v}</${k}>`)
            .join('')}</${name}>`) +
      '\n```';

export const buildBrowserControlExample = (toolFormat: ToolFormat = 'xml'): string => {
  const listTabs = fenceCall(toolFormat, 'list_tabs', {});
  const launch = fenceCall(toolFormat, 'launch_browser', {});
  const navigate = fenceCall(toolFormat, 'navigate', {
    url: 'https://shop.example.com/login',
    waitUntil: 'networkidle',
  });
  const elements = fenceCall(toolFormat, 'list_elements', {});
  const fillEmail = fenceCall(toolFormat, 'fill_input', { ref: 'input-email', value: 'test@example.com' });
  const fillPass = fenceCall(toolFormat, 'fill_input', { ref: 'input-password', value: 'Test1234!' });
  const submit = fenceCall(toolFormat, 'click_element', { ref: 'btn-login' });
  const content = fenceCall(toolFormat, 'get_page_content', {});
  const send = fenceCall(toolFormat, 'send_message', {
    agent_id: 'orchestrator',
    message:
      'TYPE: RESULT\nSTATUS: OK\nBODY:\nFLOW:\n1. navigate https://shop.example.com/login\n2. fill_input input-email\n3. fill_input input-password\n4. click_element btn-login\nOBSERVED:\n- after step 4 the URL became https://shop.example.com/account and the page shows "Welcome back"\nTRAFFIC HINTS: (expectation, not confirmed) step 4 likely triggered POST /api/auth/login\nOPEN ISSUES: none',
  });

  return `# EXAMPLES
These examples show shape only. Real tool results arrive between turns and are never predicted.

## Example 1: reproduce a login flow so the traffic is captured
Turn 1 — check browser state:
${listTabs}
STOP. Wait for the result.

Turn 2 — no browser running, so launch one:
${launch}
STOP. Wait for the browser.

Turn 3 — open the task URL:
${navigate}
STOP. Wait for load.

Turn 4 — read the interactive elements before touching any ref:
${elements}
STOP. Wait for the refs.

Turn 5 — fill the fields the task provided (independent calls, one message):
${fillEmail}
${fillPass}
STOP. Wait for both results.

Turn 6 — submit, then observe:
${submit}
STOP. Wait for the result.
${content}
STOP. Wait for the page content.

Turn 7 — send the RESULT:
${send}
STOP. Wait for the orchestrator.

## Example 2: evaluate_js requires a question first
If you need a value the other tools cannot expose:
${fenceCall(toolFormat, 'send_message', {
  agent_id: 'orchestrator',
  message:
    'TYPE: QUESTION\nSTATUS: BLOCKED\nBODY: I need to read window.__APP_CONFIG__ which get_page_content does not expose. Approve one read-only evaluate_js call on https://shop.example.com ?',
})}
STOP. Only after the orchestrator confirms, run evaluate_js.`;
};