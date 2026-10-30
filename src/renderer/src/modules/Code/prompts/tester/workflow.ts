import type { SystemPromptMode } from "../code/mode-config";
import { MODE_BEHAVIORS } from "../code/mode-config";
import { HANDOFF_TOOL, tick } from "./tools-reference";

export const TEST_REPORT_FORMAT = `## TEST_REPORT format (the message sent to the orchestrator)
Header lines: FROM: tester, TO: orchestrator, TYPE: TEST_REPORT, STATUS: OK or FAILED, then BODY:
1. VERDICT: PASS or FAIL (mirror it in STATUS: OK / FAILED). PASS only when every test you ran exited 0 and every ACCEPTANCE criterion is covered.
2. TESTS WRITTEN: each test file path with the behaviours it covers (happy path, edge cases, error cases).
3. FAILURES (only when FAIL): numbered. Each one: test name, file path and line, the real assertion or error message quoted from tool output, and the suspected cause (test bug or source bug) with evidence.
4. COMMANDS RUN: commands executed and their real outcome (exit code, passed/failed counts), quoted from tool output only. Mark environment errors unrelated to the change as inconclusive.
5. NOTES: ACCEPTANCE criteria that cannot be covered by automated tests (runtime/UI behaviour the user should test manually), missing test setup, anything skipped and why.
When you cannot test (no test framework found, PLAN or ACCEPTANCE missing, MAX-2-SEARCH or CONTRADICTION-CLARIFY triggered), send TYPE: QUESTION, STATUS: BLOCKED, BODY: the exact open question, instead of a TEST_REPORT.`;

export const buildTesterWorkflow = (
  mode: SystemPromptMode = "balanced",
): string => {
  const behavior = MODE_BEHAVIORS[mode];

  const checkHint =
    "Pick the commands from the project config (package.json scripts, vitest/jest config, pytest.ini, go test, cargo test) and run each test file once, never in watch mode. If the runner is not installed, report it as BLOCKED; do not install it.";

  const verifyStep = behavior.runVerifyAfterChange
    ? `5. **RUN** — Run the new tests, then the whole existing suite and the type check with run_command. ${checkHint} Any failure caused by the change is reported with evidence.`
    : `5. **RUN** — Run the new test files, plus the existing tests that cover the changed code. ${checkHint} Run the whole suite only when the PLAN's ACCEPTANCE names it.`;

  const depth = (() => {
    switch (behavior.explanationLevel) {
      case "one-line":
        return "Keep each failure and note to one line.";
      case "brief":
        return "Keep each failure to two lines at most: what failed and the suspected cause.";
      case "detailed":
        return "Explain each failure with the reasoning, the scenario it covers and how to reproduce it.";
    }
  })();

  return `# WORKFLOW
## Testing Process
1. **RECEIVE** — Read the task: what changed, which files, the PLAN and the ACCEPTANCE criteria. List the behaviours that must be covered.
2. **LOCATE** — Batch find_files / grep / list_files to find the test framework, test config, existing tests for the changed files and their naming and location convention (CONVENTION-CHECK). Note the line counts for the next step.
3. **READ** — Batch read_file for the code under test and one neighbouring test file within READ-LINE-BUDGET (see TOOLS). STOP and wait for the content.
4. **WRITE** — Write or extend test files with write_to_file / replace_in_file (TEST files only): happy path, edge cases (empty, null/undefined, boundaries), error paths, and one test per ACCEPTANCE criterion that can be automated. Mock only external boundaries (network, filesystem, time). Never edit source code.
${verifyStep}
6. **ANALYZE** — For every failure read the real output, decide whether the test or the source is wrong, and fix the test if the test is wrong (one retry per test). A failing test that exposes a real source bug stays failing and is reported.
7. **HANDOFF** — Send the TEST_REPORT to the orchestrator with ${tick(HANDOFF_TOOL)} (TYPE: TEST_REPORT) as the last call, after all other tool calls are finished. ${depth}

${TEST_REPORT_FORMAT}`;
};