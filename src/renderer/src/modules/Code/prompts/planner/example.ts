import type { ToolFormat } from "../code/mode-config";
import { fenceCall } from "./tools-reference";

export const buildPlannerExample = (toolFormat: ToolFormat = "xml"): string => {
  const list = fenceCall(
    "list_files",
    { folder_path: "src/features/cart", depth: 2 },
    toolFormat,
  );
  const search = fenceCall(
    "grep",
    { search_term: "getTotal\\(", folder_path: "src" },
    toolFormat,
  );
  const slice = fenceCall(
    "read_file",
    { file_path: "src/features/cart/cart-store.ts", start_line: 40, end_line: 90 },
    toolFormat,
  );
  const plan = fenceCall(
    "send_message",
    {
      agent_id: "orchestrator",
      message:
        "TYPE: PLAN\nSTATUS: OK\nBODY:\n1. GOAL: cart total must multiply price by quantity.\n2. ASSUMPTIONS: None.\n3. FILES: src/features/cart/cart-store.ts (function getTotal, lines 52-54).\n4. STEPS:\n   1) In getTotal, change the reducer from sum + i.price to sum + i.price * i.quantity.\n5. REFERENCES: src/features/cart/cart-types.ts (CartItem already has quantity).\n6. IMPACT: callers use-cart.ts and CartSummary.tsx call getTotal; signature unchanged, no edits needed there.\n7. RISKS: any caller that pre-multiplies by quantity would double count; grep found none.\n8. ACCEPTANCE: getTotal([{price:2,quantity:3}]) is 6; no other file changes.",
    },
    toolFormat,
  );
  const blocked = fenceCall(
    "send_message",
    {
      agent_id: "orchestrator",
      message:
        "TYPE: QUESTION\nSTATUS: BLOCKED\nBODY:\nBLOCKED ITEM: the name of the environment variable that holds the payment webhook secret.\nWHY: not present in .env.example, config/ or any source file (2 searches done).\nPARTIAL PLAN: steps 1-3 (route and handler skeleton) do not depend on it and are listed below; step 4 (secret loading) waits for the answer.",
    },
    toolFormat,
  );

  const plan3 = fenceCall(
    "send_message",
    {
      agent_id: "orchestrator",
      message:
        "TYPE: PLAN\nSTATUS: OK\nBODY:\n1. GOAL: rename formatDate to formatIsoDate everywhere.\n2. ASSUMPTIONS: None.\n3. FILES: src/utils/format.ts (function formatDate, lines 3-5) [verified]; callers found by grep: src/features/cart/CartSummary.tsx, src/features/orders/OrderRow.tsx, src/features/profile/ProfileCard.tsx [verified].\n4. STEPS:\n   BATCH 1 (independent, 4 writes):\n   1) format.ts, ANCHOR 'export function formatDate(': rename the function to formatIsoDate.\n   2) CartSummary.tsx, ANCHOR 'formatDate(': update the import and the call.\n   3) OrderRow.tsx, ANCHOR 'formatDate(': update the import and the call.\n   4) ProfileCard.tsx, ANCHOR 'formatDate(': update the import and the call.\n5. REFERENCES: none needed.\n6. IMPACT: no other grep match; no test references formatDate.\n7. RISKS: a dynamic import by string name would be missed; grep found none.\n8. ACCEPTANCE: no occurrence of formatDate remains under src; the four files compile.\n9. VERIFY: npx tsc --noEmit -p tsconfig.web.json",
    },
    toolFormat,
  );

  return `# EXAMPLES
These examples show shape only. Real tool results arrive between turns and are never predicted.

## Example 1: explore, read a slice, then send the PLAN
Turn 1 — batch the exploration. No send_message yet, because results are pending:
${list}
${search}
STOP. Wait for the results.

Turn 2 — grep reported cart-store.ts (340 lines) with a match at line 52, so read only the relevant slice:
${slice}
STOP. Wait for the content.

Turn 3 — all facts known, send the PLAN to the orchestrator:
${plan}

## Example 2: information impossible to infer → BLOCKED
${blocked}

## Example 3: shared function with several callers, grouped into a BATCH with anchors
${plan3}`;
};