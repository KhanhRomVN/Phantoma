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

export const buildSynthesizerExample = (toolFormat: ToolFormat = 'xml'): string => {
  const list = fenceCall(toolFormat, 'list_files', {});
  const createKv = fenceCall(toolFormat, 'create_file', {
    file_path: '_kv.recon',
    content:
      '---\nrecon: 1.0\ntype: tab\ntitle: Kv\n---\n\n# WHOIS example.com\n@box w=10 maxh=8 ui=kv icon=IdCard desc="Registrar, dates, nameservers"\n\nRegistrar: NameCheap Inc. [text] {tone=ok} {src=S-001,S-002}\nCreated: 2020-01-10 [date] {tone=ok} {src=S-001,S-002}\nNameserver: ns1.cloudflare.com [text] {tone=ok} {src=S-001,S-002}\nRegistrant email: privacy-shielded [text] {tone=warn} {src=S-001}\n',
  });
  const createIndex = fenceCall(toolFormat, 'create_file', {
    file_path: '_index.recon',
    content:
      '---\nrecon: 1.0\ntype: index\ntitle: example.com\ntarget_type: domain\ntags: WHOIS, DNS, Passive OSINT\nupdated: 2026-10-28 12:00\ntheme:\n  preset: ember\n  mode: dark\n---\n\n# Header\n@box w=10 ui=kv\n\npriority: high [enum] {tone=danger}\nperiod: 2026-10-28 → 2026-10-28 [period]\nentities: 1\nsources_used: 2\n',
  });
  const send = fenceCall(toolFormat, 'send_message', {
    agent_id: 'orchestrator',
    message:
      'TYPE: RESULT\nSTATUS: OK\nBODY:\nFILES:\n- _kv.recon — WHOIS fields (registrar, created, nameserver, registrant email)\n- _index.recon — index for example.com\nVERIFIED RECORDED: 3 fields (registrar, created, nameserver)\nUNVERIFIED RECORDED: 1 field (registrant email, single source)\nSKIPPED: none',
  });

  return `# EXAMPLES
These examples show shape only. Real tool results arrive between turns and are never predicted.

## Example 1: check what already exists
${list}
STOP. Wait for the result.

## Example 2: write the tab file first
${createKv}
STOP. Wait for the result.

## Example 3: write the index last
${createIndex}
STOP. Wait for the result.

## Example 4: report the RESULT
${send}
STOP. Wait for the orchestrator.

## Example 5: updating an existing file
Turn 1 — read the existing file before editing:
${fenceCall(toolFormat, 'read_file', { file_path: '_kv.recon' })}
STOP. Wait for the file content.

Turn 2 — patch the exact line:
${fenceCall(toolFormat, 'update_file', {
  file_path: '_kv.recon',
  old_content: 'Registrant email: privacy-shielded [text] {tone=warn} {src=S-001}',
  new_content: 'Registrant email: a.nguyen@example.com [email] {tone=ok} {src=S-001,S-002}',
})}
STOP. Wait for the result.`;
};