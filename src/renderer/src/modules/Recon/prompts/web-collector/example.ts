import type { ToolFormat } from '../types';


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

export const buildWebCollectorExample = (toolFormat: ToolFormat = 'xml'): string => {
  const listTabs = fenceCall(toolFormat, 'list_tabs', {});
  const createTab = fenceCall(toolFormat, 'create_tab', { url: 'https://whois.example.com/example.com' });
  const content = fenceCall(toolFormat, 'get_page_content', {});
  const screenshot = fenceCall(toolFormat, 'capture_screenshot', {});
  const send = fenceCall(toolFormat, 'send_message', {
    agent_id: 'orchestrator',
    message:
      'TYPE: RESULT\nSTATUS: OK\nBODY:\nSOURCE URL: https://whois.example.com/example.com\nFIELDS:\n- Registrar: NameCheap Inc. — https://whois.example.com/example.com\n- Created: 2020-01-10 — https://whois.example.com/example.com\n- Nameservers: ns1.cloudflare.com, ns2.cloudflare.com — https://whois.example.com/example.com\n- Registrant email: a.nguyen@example.com (privacy-shielded) — https://whois.example.com/example.com\nOPEN ISSUES: registrant email is behind WHOIS privacy; terminal whois may bypass.',
  });

  return `# EXAMPLES
These examples show shape only. Real tool results arrive between turns and are never predicted.

## Example 1: collect from a named URL
Turn 1 — check existing tabs:
${listTabs}
STOP. Wait for the result.

Turn 2 — open the task URL:
${createTab}
STOP. Wait for load.

Turn 3 — extract:
${content}
${screenshot}
STOP. Wait for both results.

Turn 4 — send the RESULT:
${send}
STOP. Wait for the orchestrator.

## Example 2: evaluate_js requires a question first
If you need a DOM attribute get_page_content drops:
${fenceCall(toolFormat, 'send_message', {
  agent_id: 'orchestrator',
  message:
    'TYPE: QUESTION\nSTATUS: BLOCKED\nBODY: I need to read data-* attributes not exposed by get_page_content. Approve one evaluate_js call on https://example.com ?',
})}
STOP. Only after the orchestrator confirms, run evaluate_js.`;
};