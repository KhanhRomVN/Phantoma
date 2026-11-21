import type { ToolFormat } from './types';

const fenceCall = (format: ToolFormat, name: string, params: Record<string, string>): string =>
  format === 'json'
    ? '```json\n' + JSON.stringify({ tool: name, params }) + '\n```'
    : '```xml\n' +
      (Object.keys(params).length === 0
        ? `<${name} />`
        : `<${name}>${Object.entries(params).map(([k, v]) => `<${k}>${v}</${k}>`).join('')}</${name}>`) +
      '\n```';

export const buildPlannerExample = (toolFormat: ToolFormat = 'xml'): string => {
  const list = fenceCall(toolFormat, 'list_files', {});
  const read = fenceCall(toolFormat, 'read_file', { file_path: 'notes/previous-plan.md' });
  const send = fenceCall(toolFormat, 'send_message', {
    agent_id: 'orchestrator',
    message:
      'TYPE: PLAN\nSTATUS: OK\nBODY:\nTARGET: shop.example.com login flow\nSCOPE: passive\nSTEPS:\n1. emulate_browser — browser tools — open shop.example.com/login and submit the login form with the provided test account, once\n2. emulate_analyzer — list_https/get_https_detail — inspect the captured login requests: headers, cookies, tokens in URL/body/response\n3. emulate_analyzer — resource and source review — check JS bundles for hardcoded keys and endpoints\n4. emulate_cli — `openssl s_client -connect shop.example.com:443` — cross-check TLS configuration\nPRIORITY ORDER: 1 (generate traffic) → 2 → 3 → 4\nACCEPTANCE:\n- every finding cites a request id and an excerpt\n- login flow reproduced in the stated order, exactly once\n- TLS result matches what the analyzer saw in the captured handshake\nRISKS: passive only; no fuzzer or fuzzer step without user authorization of shop.example.com.',
  });

  return `# EXAMPLES
These examples show shape only. Real tool results and agent replies arrive between turns and are never predicted.

## Example 1: inspect workspace state before planning
Turn 1 — check what already exists:
${list}
STOP. Wait for the result.

Turn 2 — if a prior plan exists, read it before planning:
${read}
STOP. Wait for the result.

## Example 2: send the plan back to the orchestrator
${send}
STOP. Wait for the orchestrator's follow-up (or the next task).

## Example 3: blocker → ask the orchestrator
${fenceCall(toolFormat, 'send_message', {
  agent_id: 'orchestrator',
  message:
    'TYPE: QUESTION\nSTATUS: BLOCKED\nBODY: The task says "test the API" but gives no host or flow. Provide the target host and whether new requests (fuzzer/fuzzer) are authorized.',
})}
STOP. Wait for the answer.`;
};