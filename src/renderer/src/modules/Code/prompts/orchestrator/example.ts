import type {
  SystemPromptMode,
  ToolFormat,
} from "@renderer/modules/Code/prompts/code/mode-config";
import { fenceCall, fenceMarkdown, fenceQuestion } from "./tools-reference";

export const buildOrchestratorExample = (
  toolFormat: ToolFormat = "xml",
  mode: SystemPromptMode = "balanced",
): string => {
  const title = fenceCall(
    "conversation_title",
    { title: "Add slugify utility" },
    toolFormat,
  );
  const agents = fenceCall("list_agents", {}, toolFormat);
  const createPlanner = fenceCall(
    "create_agent",
    {
      agent_id: "task_planner",
      agent_type: "planner",
      agent_name: "Task Planner",
    },
    toolFormat,
  );
  const createExecutor = fenceCall(
    "create_agent",
    {
      agent_id: "code_writer",
      agent_type: "executor",
      agent_name: "Code Writer",
    },
    toolFormat,
  );
  const toPlanner = fenceCall(
    "send_message",
    {
      agent_id: "task_planner",
      message:
        "TYPE: TASK\nGOAL: add a slugify helper to src/utils and use it in the post title field.\nCONTEXT: src/utils holds one helper per file; no new dependencies; read and follow the root AGENTS.md.\nINPUT: none\nEXPECTED OUTPUT: a PLAN with FILES, STEPS, REFERENCES, RISKS and ACCEPTANCE.",
    },
    toolFormat,
  );
  const toExecutor = fenceCall(
    "send_message",
    {
      agent_id: "code_writer",
      message:
        "TYPE: TASK\nGOAL: in src/utils/format.ts, change formatDate so it returns only the YYYY-MM-DD part.\nCONTEXT: single function formatDate; no other file changes; read and follow the root AGENTS.md.\nINPUT: none\nEXPECTED OUTPUT: a RESULT with DONE, FILES CHANGED, CHECKS RUN, OPEN ISSUES.",
    },
    toolFormat,
  );
  const readExecutor = fenceCall(
    "send_message",
    {
      agent_id: "code_writer",
      message:
        "TYPE: TASK\nGOAL: read TRASH.md and report its content.\nCONTEXT: read-only; change nothing.\nINPUT: none\nEXPECTED OUTPUT: a RESULT whose DONE field quotes the file content.",
    },
    toolFormat,
  );
  const rework = fenceCall(
    "send_message",
    {
      agent_id: "code_writer",
      message:
        "TYPE: REWORK\nGOAL: rework round 1 of 3. Fix ONLY the defects listed in INPUT.\nCONTEXT: do not change anything else.\nINPUT: 1. src/utils/slugify.ts lines 3-6: empty input throws; expected an empty string. 2. src/components/PostForm.tsx line 41: the import path is one level too deep.\nEXPECTED OUTPUT: a RESULT.",
    },
    toolFormat,
  );
  const ask = fenceQuestion(
    [
      {
        id: "1",
        type: "text",
        label:
          "What should the environment variable holding the payment webhook secret be named? It cannot be inferred from the codebase.",
      },
    ],
    toolFormat,
  );
  const askConfirm = fenceQuestion(
    [
      {
        id: "1",
        type: "confirm",
        label:
          "The executor needs to run 'git reset --hard HEAD~2', which permanently discards the last 2 commits. Proceed?",
      },
    ],
    toolFormat,
  );
  const finalReply = fenceMarkdown(
    "Added the slugify helper in src/utils/slugify.ts and used it in PostForm; the reviewer approved. Please test creating a post in the UI.",
    toolFormat,
  );

  const skipPlanner =
    mode === "thorough"
      ? ""
      : `

## Example 2: trivial request skips the planner
The executor already exists, so delegate straight away:
${toExecutor}
STOP. Wait for the executor's reply.`;

  return `# EXAMPLES
These examples show shape only. Message and reply text in examples is illustrative: your own prose to the user follows the response language. Real tool results and agent replies arrive between turns and are never predicted.

## Example 1: new task → check staffing → delegate to the planner
Turn 1 — set the title and check the agents in one batch:
${title}
${agents}
STOP. Wait for the result.

Turn 2 — the planner is idle, so delegate:
${toPlanner}
STOP. Wait for the planner's reply.${skipPlanner}

## Example 3: simple read request → create the executor, then send the task
Turn 1 — check agents:
${agents}
STOP. Wait for the result.

Turn 2 — no executor exists; create one and end the turn (never send_message in the same turn). Do not ask the user to confirm a read-only task:
${createExecutor}
STOP. Wait until the agent exists.

Turn 3 — send the task:
${readExecutor}
STOP. Wait for the executor's reply.

## Example 4: several agents are missing → create them in one turn, delegate in the next
Turn 1:
${createPlanner}
${createExecutor}
STOP. Wait until both agents exist.

Turn 2:
${toPlanner}
STOP. Wait for the planner's reply.

## Example 5: reviewer reported defects → forward only the defects
${rework}
STOP. Wait for the executor's reply.

## Example 6: information impossible to infer → ask the user
${ask}
STOP. Wait for the user's answer before continuing.

## Example 7: destructive step → confirm with the user first
${askConfirm}
STOP. Only after the user confirms, send the step to the executor and say in the message that the user confirmed.

## Example 8: reviewer approved → final reply to the user
${finalReply}`;
};