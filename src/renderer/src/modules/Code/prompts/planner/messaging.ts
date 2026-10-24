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
Incoming: the orchestrator's task arrives as a message starting with TYPE: <TASK|QUESTION>. It is your only source of context: you cannot see the user's messages or other agents' work.
Outgoing: every answer is one send_message call with agent_id orchestrator, for example ${send}.

- MESSAGE-LAST: a turn ends with exactly ONE send_message, made after every other tool call of the turn has returned.
Message layout: TYPE: <PLAN|QUESTION>, STATUS: <OK|BLOCKED>, BODY: <content>. Field names and enum values stay in English; free text follows the response language.
- MESSAGE-LAST: a turn ends with exactly ONE send_to_agent, made after every other tool call of the turn has returned. While you still wait for tool results, emit only tool calls.
- A message must be self-contained: the orchestrator cannot see your tool results or reasoning.
- You can send messages only after the orchestrator has assigned you a model and an account.`;
};