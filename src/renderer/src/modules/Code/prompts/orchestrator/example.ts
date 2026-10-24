import type { ToolFormat } from "../code/mode-config";
import { fenceCall, fenceMarkdown } from "./tools-reference";

export const buildOrchestratorExample = (
  toolFormat: ToolFormat = "xml",
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
      agent_type: "planner",
      agent_name: "Task Planner",
      provider_id: "deepseek",
      model_id: "deepseek-reasoner",
      account_id: "acc_123",
    },
    toolFormat,
  );
  const createExecutor = fenceCall(
    "create_agent",
    {
      agent_type: "executor",
      agent_name: "Code Writer",
      provider_id: "anthropic",
      model_id: "claude-3-5-sonnet-20241022",
      account_id: "acc_456",
    },
    toolFormat,
  );
  const toPlanner = fenceCall(
    "send_message",
    {
      agent_id: "task_planner",
      message:
        "TYPE: TASK\nGOAL: add a slugify helper to src/utils and use it in the post title field.\nCONTEXT: src/utils holds one helper per file; no new dependencies; follow AGENTS.md conventions.\nEXPECTED OUTPUT: a PLAN with FILES, STEPS, REFERENCES, RISKS and ACCEPTANCE.",
    },
    toolFormat,
  );
  const toExecutor = fenceCall(
    "send_message",
    {
      agent_id: "code_writer",
      message:
        "TYPE: TASK\nGOAL: in src/utils/format.ts, change formatDate so it returns only the YYYY-MM-DD part.\nCONTEXT: single function formatDate; no other file changes.\nEXPECTED OUTPUT: a RESULT with DONE, FILES CHANGED, CHECKS RUN, OPEN ISSUES.",
    },
    toolFormat,
  );
  const rework = fenceCall(
    "send_message",
    {
      agent_id: "code_writer",
      message:
        "TYPE: REWORK\nGOAL: rework round 1 of 3. Fix ONLY these defects from the reviewer:\n1. src/utils/slugify.ts lines 3-6: empty input throws; expected an empty string.\n2. src/components/PostForm.tsx line 41: the import path is one level too deep.\nDo not change anything else.\nEXPECTED OUTPUT: a RESULT.",
    },
    toolFormat,
  );
  const ask = fenceMarkdown(
    "Để nối webhook thanh toán, tôi cần tên biến môi trường chứa webhook secret. Không thể suy ra từ codebase. Bạn muốn đặt tên là gì?",
    toolFormat,
  );
  const finalReply = fenceMarkdown(
    "Đã thêm helper slugify vào src/utils/slugify.ts và dùng nó ở PostForm; reviewer đã duyệt. Vui lòng test lại thao tác tạo bài viết trên UI.",
    toolFormat,
  );

  return `# EXAMPLES
These examples show shape only. Real tool results and agent replies arrive between turns and are never predicted.

## Example 1: new task → check staffing → delegate to the planner
Turn 1 — set the title and check the agents in one batch:
${title}
${agents}
STOP. Wait for the result.

Turn 2 — the planner is idle, so delegate:
${toPlanner}
STOP. Wait for the planner's reply.

## Example 2: trivial request skips the planner (not allowed in thorough mode)
${toExecutor}
STOP. Wait for the executor's reply.

## Example 2.1: simple read request → create executor if needed, send task immediately
User: "đọc file TRASH.md"

Turn 1 — check agents:
${agents}
STOP. Wait for result.

Turn 2 — no executor exists, create one and send the simple read task:
${createExecutor}
${toExecutor}
STOP. Wait for executor to read and report back. DO NOT ask the user for confirmation — this is a straightforward read operation.

## Example 3: need agents that don't exist → create them immediately, then send tasks
Turn 1 — create the agents you need (UI handles model selection automatically):
${createPlanner}
${createExecutor}
STOP. Wait for create_agent results.

Turn 2 — agents are ready, send tasks to them:
${toPlanner}
STOP. Wait for the planner's reply.

## Example 4: reviewer reported defects → forward only the defects
${rework}
STOP. Wait for the executor's reply.

## Example 5: information impossible to infer → ask the user
${ask}
STOP. Wait for the user's answer before continuing.

## Example 6: reviewer approved → final reply to the user
${finalReply}`;
};