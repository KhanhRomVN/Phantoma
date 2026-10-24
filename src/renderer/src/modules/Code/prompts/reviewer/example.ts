import type { ToolFormat } from "../code/mode-config";
import { fenceCall } from "./tools-reference";

const fenceMarkdown = (content: string, format: ToolFormat): string =>
  format === "json"
    ? "```json\n" + JSON.stringify({ type: "markdown", content }) + "\n```"
    : "```xml\n<markdown>" + content + "</markdown>\n```";

export const buildReviewerExample = (
  toolFormat: ToolFormat = "xml",
): string => {
  const status = fenceCall("git_status", {}, toolFormat);
  const diff = fenceCall("git_diff", {}, toolFormat);
  const read = fenceCall(
    "read_file",
    { file_path: "src/utils/slugify.ts" },
    toolFormat,
  );
  const check = fenceCall("run_command", { command: "npx tsc --noEmit" }, toolFormat);

  const approved = fenceMarkdown(
    "FROM: reviewer\nTO: orchestrator\nTYPE: REVIEW\nSTATUS: OK\nBODY:\n1. VERDICT: APPROVED.\n2. DEFECTS: none.\n3. NOTES: slugify does not strip accents; acceptable per PLAN. Please test the post-title field manually in the UI.\n4. CHECKS RUN: npx tsc --noEmit → exit code 0, no output. git_diff shows only src/utils/slugify.ts and src/components/PostForm.tsx, both listed in the PLAN.",
    toolFormat,
  );
  const rework = fenceMarkdown(
    "FROM: reviewer\nTO: orchestrator\nTYPE: REVIEW\nSTATUS: NEEDS_REWORK\nBODY:\n1. VERDICT: NEEDS_REWORK.\n2. DEFECTS:\n   1) src/utils/slugify.ts lines 3-6 (blocking): slugify(\"\") throws because input[0] is read before the empty check; expected an empty string.\n   2) src/components/PostForm.tsx line 41 (blocking): import \"../utils/slugify\" does not resolve; the file is two levels up (\"../../utils/slugify\"). tsc reports TS2307.\n3. NOTES: src/utils/legacy.ts was also modified but is not in the PLAN; revert that edit or justify it.\n4. CHECKS RUN: npx tsc --noEmit → exit code 2, error TS2307 in PostForm.tsx.",
    toolFormat,
  );

  return `# EXAMPLES
These examples show shape only. Real tool results arrive between turns and are never predicted.

## Example 1: inspect → verify → judge
Turn 1 — see what really changed, then read the changed files (never trust the RESULT alone):
${status}
${diff}
STOP. Wait for the results.

Turn 2 — read each changed file reported by git_status (within READ-LINE-BUDGET):
${read}
STOP. Wait for the content.

Turn 3 — verify with a non-mutating command:
${check}
STOP. Wait for the real output.

Turn 4 — with real evidence, hand off one verdict.

## Example 2: everything verified → APPROVED
${approved}

## Example 3: concrete, verifiable defects → NEEDS_REWORK
${rework}`;
};