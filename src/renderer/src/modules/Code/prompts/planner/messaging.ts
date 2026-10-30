import type { ToolFormat } from "../code/mode-config";
import { callText, tick } from "./tools-reference";

export const buildPlannerMessaging = (toolFormat: ToolFormat = "xml"): string => {
  const send = tick(
    callText(
      "send_message",
      {
        agent_id: "orchestrator",
        message: "TYPE: PLAN\nSTATUS: OK\nBODY:\n1. GOAL: ...\n2. FILES: ...",
      },
      toolFormat,
    ),
  );
  return `# MESSAGING
The planner talks to exactly one agent: the orchestrator. It never talks to the user, the executor or the reviewer.
Incoming: the orchestrator's task arrives as a message starting with TYPE: <TASK|QUESTION>. It is your only source of context: you cannot see the user's messages or other agents' work. Follow-ups (an answer to your QUESTION, reviewer feedback) arrive the same way; handle them as described under REVISE in WORKFLOW.
Outgoing: every answer is one send_message call with agent_id orchestrator, for example ${send}.
Message layout: TYPE: <PLAN|QUESTION>, STATUS: <OK|BLOCKED>, BODY: <content>. Field names and enum values stay in English; free text follows the response language.
- A message must be self-contained: the orchestrator cannot see your tool results or reasoning.
`;
};