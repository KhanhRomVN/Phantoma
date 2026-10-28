import type { ToolFormat } from '../types';


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
  const read = fenceCall(toolFormat, 'read_file', { file_path: '_index.recon' });
  const send = fenceCall(toolFormat, 'send_message', {
    agent_id: 'orchestrator',
    message:
      'TYPE: PLAN\nSTATUS: OK\nBODY:\nTARGET: domain example.com\nSCOPE: passive\nCOLLECTION VECTORS:\n1. recon_web — whois.example.com/example.com — registrar, creation date, nameservers, contact email\n2. recon_local — `dig +short NS example.com` — cross-check nameservers\n3. recon_web — cached pages of example.com (search engine cache) — page description, linked subdomains\n4. recon_web — public social profiles mentioning example.com\nPRIORITY ORDER: 1 → 2 (independent WHOIS/DNS confirmation) → 3 → 4\nACCEPTANCE:\n- every WHOIS field listed has at least 2 independent source URLs\n- nameservers match between web WHOIS and terminal dig\n- social profiles only counted if they link to example.com\nRISKS: passive only; social profiles may belong to unrelated entities — flag if no cross-link.',
  });

  return `# EXAMPLES
These examples show shape only. Real tool results and agent replies arrive between turns and are never predicted.

## Example 1: inspect workspace state before planning
Turn 1 — check what already exists:
${list}
STOP. Wait for the result.

Turn 2 — if an index file exists, read it before planning:
${read}
STOP. Wait for the result.

## Example 2: send the plan back to the orchestrator
${send}
STOP. Wait for the orchestrator's follow-up (or the next task).

## Example 3: blocker → ask the orchestrator
${fenceCall(toolFormat, 'send_message', {
  agent_id: 'orchestrator',
  message:
    'TYPE: QUESTION\nSTATUS: BLOCKED\nBODY: The task says "collect data for John" but does not provide a last name, location or account handle. Multiple real people share that first name; provide one more identifier.',
})}
STOP. Wait for the answer.`;
};