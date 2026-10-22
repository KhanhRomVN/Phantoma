import type { SystemPromptMode } from "../../code/mode-config";
import { MODE_BEHAVIORS, MAX_READ_LINES_PER_TURN } from "../../code/mode-config";

export const REVIEW_FORMAT = `## REVIEW format (BODY of the REVIEW handoff)
1. VERDICT: APPROVED or NEEDS_REWORK (mirror it in STATUS: OK / NEEDS_REWORK).
2. DEFECTS (only when NEEDS_REWORK): numbered, ordered by severity. Each one: file path, line range, what is wrong, the expected fix. Only blocking problems belong here.
3. NOTES: non-blocking suggestions and manual tests the user should run, clearly separated from defects.
4. CHECKS RUN: commands executed and their real outcome, quoted from tool output only.`;

export const buildReviewerWorkflow = (
  mode: SystemPromptMode = "balanced",
): string => {
  const behavior = MODE_BEHAVIORS[mode];

  const verifyStep = behavior.runVerifyAfterChange
    ? "4. **VERIFY** — Run the type/syntax/lint check (LSP-CHECK-FALLBACK) AND the project's existing test and build commands with run_command. Any failure caused by the change is a blocking defect. Do not write new tests."
    : "4. **VERIFY** — Run the type/syntax/lint check (LSP-CHECK-FALLBACK) over the changed files with run_command. Run existing tests or the build only when the PLAN's ACCEPTANCE names them. A failure caused by the change is a blocking defect.";

  const depth = (() => {
    switch (behavior.explanationLevel) {
      case "one-line":
        return "Keep each defect and note to one line.";
      case "brief":
        return "Keep each defect to two lines at most: what is wrong and the expected fix.";
      case "detailed":
        return "Explain each defect with the reasoning and the failure scenario it causes, and justify every note.";
    }
  })();

  return `# WORKFLOW
## Review Process
1. **RECEIVE** — Read the executor's RESULT and the PLAN. List the files that should have changed and the ACCEPTANCE criteria.
2. **INSPECT** — Batch git_status and git_diff, then read_file for each changed file (sum line counts, keep each batch at or under ${MAX_READ_LINES_PER_TURN} lines, read slices of oversized files). STOP and wait for the content. Compare the real diff with FILES CHANGED: an unreported or unplanned change is a defect.
3. **ANALYZE** — Check logic and edge cases, types and imports, error handling, PLAN fidelity, scope (no unrelated edits, no leftover debug logs, no secrets) and project conventions. Grep for the same faulty pattern elsewhere (PATTERN-REUSE).
${verifyStep}
5. **JUDGE** — Tick every ACCEPTANCE criterion as met or unmet. APPROVED only if all are met and no blocking defect remains. ${depth}
6. **HANDOFF** — Send the REVIEW to the orchestrator (TYPE: REVIEW) after all tool calls are finished.

${REVIEW_FORMAT}`;
};