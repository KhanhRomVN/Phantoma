import type { ToolFormat } from "../code/mode-config";
import { HANDOFF_AGENT, fenceCall } from "./tools-reference";

const handoff = (message: string, format: ToolFormat): string =>
  fenceCall("send_message", { agent_id: HANDOFF_AGENT, message }, format);

export const buildTesterExample = (
  toolFormat: ToolFormat = "xml",
): string => {
  const locate = fenceCall(
    "find_files",
    { file_name: "*.test.ts", folder_path: "src/utils" },
    toolFormat,
  );
  const read = fenceCall(
    "read_file",
    { file_path: "src/utils/slugify.ts" },
    toolFormat,
  );
  const write = fenceCall(
    "write_to_file",
    {
      file_path: "src/utils/slugify.test.ts",
      content:
        "import { describe, it, expect } from 'vitest';\nimport { slugify } from './slugify';\n\ndescribe('slugify', () => {\n  it('lowercases and joins words with dashes', () => {\n    expect(slugify('Hello World')).toBe('hello-world');\n  });\n  it('returns an empty string for empty input', () => {\n    expect(slugify('')).toBe('');\n  });\n});\n",
    },
    toolFormat,
  );
  const run = fenceCall(
    "run_command",
    { command: "npx vitest run src/utils/slugify.test.ts" },
    toolFormat,
  );

  const pass = handoff(
    "FROM: tester\nTO: orchestrator\nTYPE: TEST_REPORT\nSTATUS: OK\nBODY:\n1. VERDICT: PASS.\n2. TESTS WRITTEN: src/utils/slugify.test.ts: lowercase + dash join, empty input.\n3. FAILURES: none.\n4. COMMANDS RUN: npx vitest run src/utils/slugify.test.ts → exit code 0, 2 passed, 0 failed.\n5. NOTES: ACCEPTANCE criterion 3 (title preview updates in the UI) cannot be automated; the user should type a title in the post-title field.",
    toolFormat,
  );
  const fail = handoff(
    "FROM: tester\nTO: orchestrator\nTYPE: TEST_REPORT\nSTATUS: FAILED\nBODY:\n1. VERDICT: FAIL.\n2. TESTS WRITTEN: src/utils/slugify.test.ts: lowercase + dash join, empty input.\n3. FAILURES:\n   1) 'slugify > returns an empty string for empty input' (src/utils/slugify.test.ts line 9): TypeError: Cannot read properties of undefined (reading '0') at src/utils/slugify.ts:3. Cause: source bug, input[0] is read before the empty check; the test is correct.\n4. COMMANDS RUN: npx vitest run src/utils/slugify.test.ts → exit code 1, 1 passed, 1 failed.\n5. NOTES: the failing test was left in place on purpose; the executor should fix slugify.ts.",
    toolFormat,
  );
  const blocked = handoff(
    "FROM: tester\nTO: orchestrator\nTYPE: QUESTION\nSTATUS: BLOCKED\nBODY: No test framework found: package.json has no test script and no vitest/jest config exists (find_files and grep returned nothing). Which framework should the tests use, or should testing be skipped?",
    toolFormat,
  );

  return `# EXAMPLES
These examples show shape only. Real tool results arrive between turns and are never predicted.

## Example 1: locate → read → write → run → report
Turn 1 — find existing tests and the convention:
${locate}
STOP. Wait for the listing.

Turn 2 — read the code under test (and one neighbouring test) within READ-LINE-BUDGET:
${read}
STOP. Wait for the content.

Turn 3 — write the test file (TEST files only):
${write}
STOP. Wait for the write result.

Turn 4 — run it once, never in watch mode:
${run}
STOP. Wait for the real output.

Turn 5 — with real results, hand off one report with the handoff tool as the last call.

## Example 2: all tests pass → PASS
${pass}

## Example 3: test exposes a real source bug → FAIL (source is not edited)
${fail}

## Example 4: no test framework → BLOCKED
${blocked}`;
};