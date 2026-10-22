import type { ToolFormat } from "./types";
import { fenceMarkdown } from "./tool-catalog";

export const buildHandoffProtocol = (format: ToolFormat): string => {
  const example = fenceMarkdown(
    "FROM: planner\nTO: orchestrator\nTYPE: PLAN\nSTATUS: OK\nBODY:\n1. GOAL: ...\n2. FILES: ...",
    format,
  );
  return `# HANDOFF PROTOCOL
Agents in this workflow exchange work only through plain-text handoff messages. Every handoff uses exactly this layout (field names and enum values stay in English, free text follows the response language):
FROM: <orchestrator|planner|executor|reviewer|user>
TO: <orchestrator|planner|executor|reviewer|user>
TYPE: <TASK|PLAN|RESULT|REVIEW|ESCALATION>
STATUS: <OK|BLOCKED|NEEDS_REWORK>
BODY:
<content of the handoff>

Flow: user → orchestrator → planner → orchestrator → executor → orchestrator → reviewer → orchestrator → (executor again if NEEDS_REWORK, otherwise user).
- Only the orchestrator talks to the user. Agents never skip the orchestrator when passing work.
- HANDOFF-LAST: a turn ends with exactly ONE handoff, emitted as a markdown message after all tool calls of the turn are finished. While you still wait for tool results, emit only tool calls and no handoff.
- A handoff must be self-contained: the receiver has no access to the sender's tool results or reasoning.

Handoff example:
${example}`;
};