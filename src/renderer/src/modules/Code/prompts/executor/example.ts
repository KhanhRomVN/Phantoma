import type { ToolFormat } from "../code/mode-config";
import { fenceCall } from "./tools-reference";

const fenceMarkdown = (content: string, format: ToolFormat): string =>
  format === "json"
    ? "```json\n" + JSON.stringify({ type: "markdown", content }) + "\n```"
    : "```xml\n<markdown>" + content + "</markdown>\n```";

export const buildExecutorExample = (
  toolFormat: ToolFormat = "xml",
): string => {
  const readStore = fenceCall(
    "read_file",
    { file_path: "src/features/cart/cart-store.ts" },
    toolFormat,
  );
  const readTypes = fenceCall(
    "read_file",
    { file_path: "src/features/cart/cart-types.ts" },
    toolFormat,
  );
  const edit = fenceCall(
    "replace_in_file",
    {
      file_path: "src/features/cart/cart-store.ts",
      old_content:
        "function getTotal(items: CartItem[]): number {\n  return items.reduce((sum, i) => sum + i.price, 0);\n}",
      new_content:
        "function getTotal(items: CartItem[]): number {\n  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);\n}",
    },
    toolFormat,
  );
  const check = fenceCall("run_command", { command: "npx tsc --noEmit" }, toolFormat);

  const result = fenceMarkdown(
    "FROM: executor\nTO: orchestrator\nTYPE: RESULT\nSTATUS: OK\nBODY:\n1. DONE: step 1 done (getTotal now multiplies price by quantity).\n2. FILES CHANGED: src/features/cart/cart-store.ts — getTotal reducer.\n3. CHECKS RUN: npx tsc --noEmit → exit code 0, no output.\n4. OPEN ISSUES: cart total on screen should be checked manually in the UI.",
    toolFormat,
  );
  const blocked = fenceMarkdown(
    "FROM: executor\nTO: orchestrator\nTYPE: RESULT\nSTATUS: BLOCKED\nBODY:\n1. DONE: none; stopped before editing.\n2. BLOCKER: PLAN step 1 says to edit getTotal at src/features/cart/cart-store.ts lines 52-54, but the file has no getTotal; the function is calculateTotal in src/features/cart/totals.ts (found with grep).\n3. NEED: confirmation that the PLAN should target calculateTotal instead.",
    toolFormat,
  );

  return `# EXAMPLES
These examples show shape only. Real tool results arrive between turns and are never predicted.

## Example 1: read → edit → check → RESULT
Turn 1 — read every file named in the PLAN together (READ-BEFORE-EDIT):
${readStore}
${readTypes}
STOP. Wait for the content.

Turn 2 — after the content returns, make the minimal byte-perfect edit:
${edit}
STOP. Wait for the write confirmation.

Turn 3 — check the change (LSP-CHECK-FALLBACK):
${check}
STOP. Wait for the real output.

Turn 4 — only now, with real evidence, hand off:
${result}

## Example 2: the PLAN contradicts the real code → BLOCKED, no improvising
${blocked}`;
};