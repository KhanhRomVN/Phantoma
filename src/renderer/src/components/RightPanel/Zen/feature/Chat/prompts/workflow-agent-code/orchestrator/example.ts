import type { ToolFormat } from "../shared/types";
import { fenceCall, fenceMarkdown } from "../shared/tool-catalog";

export const buildOrchestratorExample = (
  toolFormat: ToolFormat = "xml",
): string => {
  const title = fenceCall(
    "conversation_title",
    { title: "Add slugify utility" },
    toolFormat,
  );
  const find = fenceCall(
    "find_files",
    { file_name: "*.ts", folder_path: "src/utils" },
    toolFormat,
  );
  const search = fenceCall(
    "grep",
    { search_term: "export (function|const) \\w+", folder_path: "src/utils" },
    toolFormat,
  );

  const taskToPlanner = fenceMarkdown(
    "FROM: orchestrator\nTO: planner\nTYPE: TASK\nSTATUS: OK\nBODY:\nGOAL: add a slugify helper to src/utils and use it in the post title field.\nKNOWN CONTEXT: src/utils holds one helper per file (format.ts, ids.ts).\nCONSTRAINTS: no new dependencies; follow AGENTS.md conventions.\nEXPECTED OUTPUT: a PLAN with FILES, STEPS, REFERENCES, RISKS and ACCEPTANCE.",
    toolFormat,
  );
  const taskToExecutor = fenceMarkdown(
    "FROM: orchestrator\nTO: executor\nTYPE: TASK\nSTATUS: OK\nBODY:\nGOAL: in src/utils/format.ts, change formatDate so it returns only the YYYY-MM-DD part.\nFILES: src/utils/format.ts (function formatDate).\nACCEPTANCE: formatDate(new Date()) returns a date-only string; no other file changes.\nEXPECTED OUTPUT: a RESULT handoff.",
    toolFormat,
  );
  const rework = fenceMarkdown(
    "FROM: orchestrator\nTO: executor\nTYPE: TASK\nSTATUS: NEEDS_REWORK\nBODY:\nRework round 1 of 3. Fix ONLY these defects from the reviewer:\n1. src/utils/slugify.ts lines 3-6: empty input throws; expected an empty string.\n2. src/components/PostForm.tsx line 41: the import path is one level too deep.\nDo not change anything else. Return a RESULT handoff.",
    toolFormat,
  );
  const escalation = fenceMarkdown(
    "FROM: orchestrator\nTO: user\nTYPE: ESCALATION\nSTATUS: BLOCKED\nBODY:\nTo wire up the payment webhook I need the environment variable name that holds the webhook secret. It cannot be inferred from the codebase. What should it be called?",
    toolFormat,
  );
  const finalReply = fenceMarkdown(
    "Đã thêm helper slugify vào src/utils/slugify.ts và dùng nó ở PostForm; reviewer đã duyệt. Vui lòng test lại thao tác tạo bài viết trên UI.",
    toolFormat,
  );

  return `# EXAMPLES
These examples show shape only. Real tool results arrive between turns and are never predicted.

## Example 1: new task → light context → TASK handoff to the planner
Turn 1 — set the title and batch the exploration. No handoff yet, because results are still pending:
${title}
${find}
${search}
STOP. Wait for the results.

Turn 2 — after the results, delegate:
${taskToPlanner}

## Example 2: trivial request skips the planner (not allowed in thorough mode)
${taskToExecutor}

## Example 3: reviewer returned NEEDS_REWORK → forward only the defects
${rework}

## Example 4: information impossible to infer → ESCALATION to the user
${escalation}
STOP. Wait for the user's answer before continuing.

## Example 5: reviewer approved → final reply to the user
${finalReply}`;
};