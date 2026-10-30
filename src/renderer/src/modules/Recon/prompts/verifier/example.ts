import type { ToolFormat } from '../types';

const fenceCall = (
  format: ToolFormat,
  name: string,
  params: Record<string, string>,
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

export const buildVerifierExample = (toolFormat: ToolFormat = 'xml'): string => {
  const read = fenceCall(toolFormat, 'read_file', { file_path: '_kv.recon' });
  const send = fenceCall(toolFormat, 'send_message', {
    agent_id: 'orchestrator',
    message:
      'TYPE: REVIEW\nSTATUS: OK\nBODY:\nVERIFIED:\n- registrar = NameCheap Inc. — [S-001, S-002]\n- created = 2020-01-10 — [S-001, S-002]\nUNVERIFIED:\n- registrant_email = a@example.com — only [S-001], privacy-shielded\nCONTRADICTIONS:\n- nameservers = ns1.cloudflare.com vs ns1.old.com — [S-001] vs [S-002]\nNOTES: nameserver mismatch blocks synthesis of the nameserver field; recommend a third source via terminal whois on ns1.cloudflare.com.',
  });

  return `# EXAMPLES
These examples show shape only. Real tool results and agent replies arrive between turns and are never predicted.

## Example 1: cross-check against prior .recon
If the orchestrator names existing files, read them:
${read}
STOP. Wait for the result.

## Example 2: send the REVIEW
${send}
STOP. Wait for the orchestrator.

## Example 3: blocked (missing criteria)
If the incoming VERIFY message has no ACCEPTANCE criteria:
${fenceCall(toolFormat, 'send_message', {
  agent_id: 'orchestrator',
  message:
    'TYPE: QUESTION\nSTATUS: BLOCKED\nBODY: The VERIFY message did not include ACCEPTANCE criteria. Which fields must meet the two-source rule before this batch can be marked VERIFIED?',
})}
STOP. Wait for the orchestrator's answer.`;
};