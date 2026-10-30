import type { ToolFormat } from "../code/mode-config";
import { HANDOFF_AGENT, fenceCall } from "./tools-reference";

const handoff = (message: string, format: ToolFormat): string =>
  fenceCall("send_message", { agent_id: HANDOFF_AGENT, message }, format);

export const buildReviewerExample = (
  toolFormat: ToolFormat = "xml",
): string => {

  const read = fenceCall(
    "read_file",
    { file_path: "src/utils/slugify.ts" },
    toolFormat,
  );
  const check = fenceCall("run_command", { command: "npx tsc --noEmit" }, toolFormat);

  const approved = handoff(
    "FROM: reviewer\nTO: orchestrator\nTYPE: REVIEW\nSTATUS: OK\nBODY:\n1. VERDICT: APPROVED.\n2. DEFECTS: none.\n3. NOTES: [nit] slugify does not strip accents; acceptable per PLAN. Manual test: type a title in the post-title field of the UI.\n4. CHECKS RUN: npx tsc --noEmit → exit code 0, no output. Only src/utils/slugify.ts and src/components/PostForm.tsx were read, both listed in the PLAN.",
    toolFormat,
  );
  const rework = handoff(
    "FROM: reviewer\nTO: orchestrator\nTYPE: REVIEW\nSTATUS: NEEDS_REWORK\nBODY:\n1. VERDICT: NEEDS_REWORK.\n2. DEFECTS:\n   1) src/utils/slugify.ts lines 3-6 (blocking): slugify('') throws because input[0] is read before the empty check; expected an empty string.\n   2) src/components/PostForm.tsx line 41 (blocking): import '../utils/slugify' does not resolve; the file is two levels up ('../../utils/slugify'). tsc reports TS2307.\n3. NOTES: [should-fix] no other caller of slugify was found by grep, but PostForm.tsx line 58 repeats the same unguarded input[0] pattern.\n4. CHECKS RUN: npx tsc --noEmit → exit code 2, error TS2307 in PostForm.tsx.",
    toolFormat,
  );
  const edge = handoff(
    "FROM: reviewer\nTO: orchestrator\nTYPE: REVIEW\nSTATUS: NEEDS_REWORK\nBODY:\n1. VERDICT: NEEDS_REWORK.\n2. DEFECTS:\n   1) src/config.ts line 12 (blocking): a hardcoded API token [REDACTED] was added; expected a read from the environment variable already used on line 9.\n   2) src/utils/legacy.ts (blocking): modified but not in the PLAN; revert that edit or justify it.\n3. NOTES: ACCEPTANCE criterion 2 (login button shows a spinner) cannot be verified statically; the user should test it manually.\n4. CHECKS RUN: npx tsc --noEmit → exit code 0. npm test → exit code 1, 'ECONNREFUSED 127.0.0.1:5432' from an unrelated database test; inconclusive, not caused by the change.",
    toolFormat,
  );

  return `# EXAMPLES
These examples show shape only. Real tool results arrive between turns and are never predicted.

## Example 1: inspect → verify → judge
Turn 1 — read each file listed in FILES CHANGED (within READ-LINE-BUDGET; never trust the RESULT alone):
${read}
STOP. Wait for the content.

Turn 2 — verify with a non-mutating command:
${check}
STOP. Wait for the real output.

Turn 3 — with real evidence, hand off one verdict with the handoff tool as the last call.

## Example 2: everything verified → APPROVED
${approved}

## Example 3: concrete, verifiable defects → NEEDS_REWORK
${rework}

## Example 4: leaked secret, out-of-scope edit, inconclusive check, unverifiable criterion
${edge}`;
};