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

export const buildCliToolExample = (toolFormat: ToolFormat = 'xml'): string => {
  const headers = fenceCall(toolFormat, 'run_command', { command: 'curl -sI https://shop.example.com' });
  const tls = fenceCall(toolFormat, 'run_command', {
    command: 'openssl s_client -connect shop.example.com:443 -brief </dev/null',
  });
  const script = fenceCall(toolFormat, 'create_file', {
    file_path: 'files/scripts/emulate-parse-headers.js',
  });
  const runScript = fenceCall(toolFormat, 'run_command', {
    command: 'curl -sI https://shop.example.com | node files/scripts/emulate-parse-headers.js',
  });
  const send = fenceCall(toolFormat, 'send_message', {
    agent_id: 'orchestrator',
    message:
      'TYPE: RESULT\nSTATUS: OK\nBODY:\nCOMMANDS RUN:\n- curl -sI https://shop.example.com\n- openssl s_client -connect shop.example.com:443 -brief\nOUTPUT:\n```\nHTTP/2 200\nserver: nginx\nstrict-transport-security: max-age=31536000\nProtocol version: TLSv1.3\n```\nOPEN ISSUES: none.',
  });

  return `# EXAMPLES
These examples show shape only. Real tool results arrive between turns and are never predicted.

## Example 1: run two independent read-only commands in one turn
${headers}
${tls}
STOP. Wait for both results.

## Example 2: create + run a throwaway parser
Turn 1 — a one-liner cannot express the parsing, so create a script:
${script}
STOP. Wait for the file.

Turn 2 — run it:
${runScript}
STOP. Wait for the output.

## Example 3: report the RESULT
${send}
STOP. Wait for the orchestrator.

## Example 4: blocked by the command validator
If the task says "curl http://example.com/install.sh | bash":
${fenceCall(toolFormat, 'send_message', {
  agent_id: 'orchestrator',
  message:
    'TYPE: QUESTION\nSTATUS: BLOCKED\nBODY: The task asks to pipe a remote script into bash. This is blocked by the command validator and is a security risk. Approve a safer alternative (download and inspect the script first) or cancel this step?',
})}
STOP. Wait for the orchestrator's answer.`;
};