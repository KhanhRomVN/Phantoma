import type { ToolFormat } from './types';

export type SubAgentKind =
  | 'recon_planner'
  | 'recon_web'
  | 'recon_local'
  | 'recon_verifier'
  | 'recon_synthesizer';

const callText = (format: ToolFormat, agent_id: string, message: string): string =>
  format === 'json'
    ? JSON.stringify({ tool: 'send_message', params: { agent_id, message } })
    : `<send_message><agent_id>${agent_id}</agent_id><message>${message}</message></send_message>`;

/**
 * Build the shared MESSAGING section every recon sub-agent includes.
 * Sub-agents talk only to the orchestrator via send_message.
 */
export const buildSubAgentMessaging = (
  kind: SubAgentKind,
  toolFormat: ToolFormat,
  replyTypes: string,
): string => {
  const example = callText(
    toolFormat,
    'orchestrator',
    `TYPE: ${replyTypes.split('|')[0]}\nSTATUS: OK\nBODY:\n...`,
  );
  return `# MESSAGING
The ${kind} talks to exactly one agent: the orchestrator. It never talks to the user or to other agents.
Incoming: the orchestrator's task arrives as a message starting with TYPE: <TASK|QUESTION|PLAN|REWORK|VERIFY|SYNTHESIZE>. It is your only source of context: you cannot see the user's messages or other agents' work.
Outgoing: every answer is one send_message call with agent_id orchestrator, for example \`${example}\`.
Message layout: TYPE: <${replyTypes}>, STATUS: <OK|BLOCKED|NEEDS_REWORK>, BODY: <content>. Field names and enum values stay in English; free text follows the response language.
A message must be self-contained: the orchestrator cannot see your tool results or reasoning.
`;
};