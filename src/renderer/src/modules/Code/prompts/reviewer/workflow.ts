import type { SystemPromptMode } from "../code/mode-config";
import { MODE_BEHAVIORS } from "../code/mode-config";
import { HANDOFF_TOOL, tick } from "./tools-reference";

export const REVIEW_FORMAT = `## REVIEW format (the message sent to the orchestrator)
Header lines: FROM: reviewer, TO: orchestrator, TYPE: REVIEW, STATUS: OK or NEEDS_REWORK, then BODY:
1. VERDICT: APPROVED or NEEDS_REWORK (mirror it in STATUS: OK / NEEDS_REWORK).
2. DEFECTS (only when NEEDS_REWORK): numbered, ordered by severity. Each one: file path, line range, what is wrong, the expected fix. Only blocking problems belong here.
3. NOTES: non-blocking items tagged [should-fix] or [nit], manual tests the user should run, and any ACCEPTANCE criterion you could not verify, clearly separated from defects.
4. CHECKS RUN: commands executed and their real outcome, quoted from tool output only. Mark environment errors unrelated to the change as inconclusive.
When you cannot review (PLAN or ACCEPTANCE missing, scope unreadable, MAX-2-SEARCH or CONTRADICTION-CLARIFY triggered), send TYPE: QUESTION, STATUS: BLOCKED, BODY: the exact open question, instead of a REVIEW.`;

export const buildReviewerWorkflow = (
  mode: SystemPromptMode = "balanced",
): string => {
  const behavior = MODE_BEHAVIORS[mode];

  const checkHint =
    "Pick the type/syntax/lint check from the language and project config (TypeScript: npx tsc --noEmit; Python: mypy or pylint; Go: go vet; Rust: cargo check; lint without any fix flag), scoped to the changed files when possible. If the tool is not installed, report it as inconclusive; do not install it.";

  const verifyStep = behavior.runVerifyAfterChange
    ? `4. **VERIFY** — Run the type/syntax/lint check AND the project's existing test and build commands with run_command. ${checkHint} Any failure caused by the change is a blocking defect. Do not write new tests.`
    : `4. **VERIFY** — Run the type/syntax/lint check over the changed files with run_command. ${checkHint} Run existing tests or the build only when the PLAN's ACCEPTANCE names them. A failure caused by the change is a blocking defect.`;

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
2. **INSPECT** — Batch read_file for the files listed in FILES CHANGED within READ-LINE-BUDGET (see TOOLS). Read logic/source files first, then config and types, then docs. For a large file read only the relevant sections plus about 20 lines around them (start_line/end_line). STOP and wait for the content. Use grep or find_files to detect files that look changed but are not in FILES CHANGED: an unreported or unplanned change is a defect.
3. **ANALYZE** — Check each group:
   - Logic: edge cases, null/undefined, off-by-one, async ordering and race conditions, swallowed or missing error handling, leaked listeners/timers/handles.
   - Contracts: types and imports resolve; for every changed signature, export or shared type, grep all callers/importers and confirm they still match.
   - Scope: PLAN fidelity, no unrelated edits, no leftover debug logs, no secrets, project conventions.
   - Same pattern elsewhere: grep for the same faulty pattern in the codebase and report every instance.
${verifyStep}
5. **JUDGE** — Tick every ACCEPTANCE criterion as met or unmet. APPROVED only if all are met and no blocking defect remains. ${depth}
6. **HANDOFF** — Send the REVIEW to the orchestrator with ${tick(HANDOFF_TOOL)} (TYPE: REVIEW) as the last call, after all other tool calls are finished.

${REVIEW_FORMAT}`;
};