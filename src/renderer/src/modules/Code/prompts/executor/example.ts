// src/webview-ui/src/features/chat/prompts/example.ts
import type { ToolFormat } from "../code/mode-config";

const EXAMPLE_HEADER_AND_CORE = `# EXAMPLES
This section shows how each tool is used correctly, and how several tools are combined into realistic multi-turn batches. Titles and descriptions are for your reference only — never output them to the user. Follow the XML tag format exactly as defined in TOOLS REFERENCE and TOOL VALIDATION.

## PART 1 — SINGLE-TOOL EXAMPLES

### Example: read_file — whole file
**Description**: Reading a small file completely before editing it, per READ-BEFORE-EDIT.
\`\`\`xml
<read_file><file_path>src/utils/format.ts</file_path></read_file>
\`\`\`

### Example: read_file — line range
**Description**: A file is large (>500 lines) and only one function is relevant. Narrow the read instead of pulling the whole file.
\`\`\`xml
<read_file><file_path>src/server/router.ts</file_path><start_line>120</start_line><end_line>180</end_line></read_file>
\`\`\`

### Example: write_to_file — new file
**Description**: Creating a brand-new file that does not exist yet. Always use write_to_file for creation, never replace_in_file.
\`\`\`xml
<write_to_file>
<file_path>src/utils/slugify.ts</file_path>
<content>export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
</content>
</write_to_file>
\`\`\`

### Example: replace_in_file — targeted edit
**Description**: old_content must be an exact, byte-perfect excerpt of the file just read — same indentation, same whitespace. Only the minimal changed region is included.
\`\`\`xml
<replace_in_file>
<file_path>src/utils/format.ts</file_path>
<old_content>export function formatDate(date: Date): string {
  return date.toISOString();
}</old_content>
<new_content>export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}</new_content>
</replace_in_file>
\`\`\`

### Example: list_files — shallow
**Description**: Getting a quick top-level orientation of a folder before deciding where to dig deeper.
\`\`\`xml
<list_files><folder_path>src/features/chat</folder_path></list_files>
\`\`\`

### Example: list_files — deep
**Description**: Need the full subtree of a feature folder to understand module boundaries before a larger refactor.
\`\`\`xml
<list_files><folder_path>src/features/chat</folder_path><depth>max</depth></list_files>
\`\`\`

### Example: find_files — by exact name
**Description**: Locating a specific file across the whole workspace when its folder is unknown.
\`\`\`xml
<find_files><file_name>vite.config.ts</file_name></find_files>
\`\`\`

### Example: find_files — by pattern, scoped
**Description**: Finding all test files inside one folder, rather than the entire repo, to keep results relevant.
\`\`\`xml
<find_files><file_name>*.test.ts</file_name><folder_path>src/features/auth</folder_path></find_files>
\`\`\`

### Example: grep — single file
**Description**: Checking every usage of a function inside one known file before renaming it locally.
\`\`\`xml
<grep><search_term>formatDate\\(</search_term><file_path>src/utils/format.ts</file_path></grep>
\`\`\`

### Example: grep — folder-wide, PATTERN-REUSE
**Description**: Before fixing a bug, checking whether the same faulty pattern exists elsewhere in the codebase so all instances get fixed together.
\`\`\`xml
<grep><search_term>catch\\s*\\(\\s*e\\s*\\)\\s*\\{\\s*\\}</search_term><folder_path>src</folder_path></grep>
\`\`\`

### Example: delete_file
**Description**: Removing a file that is fully superseded by a new module. Confirm with the orchestrator first if this could be considered destructive/irreversible under the active mode.
\`\`\`xml
<delete_file><file_path>src/utils/legacy-format.ts</file_path></delete_file>
\`\`\`

### Example: run_command — safe, non-destructive
**Description**: Installing a dependency needed for the current task.
\`\`\`xml
<run_command><command>npm install date-fns</command></run_command>
\`\`\`

### Example: run_command — scoped to a subfolder
**Description**: Running a script that only makes sense from inside a specific package/workspace folder.
\`\`\`xml
<run_command><command>npm run build</command><folder_path>src/webview-ui</folder_path></run_command>
\`\`\`

### Example: run_command — interactive prompt written correctly
**Description**: stdin is a pipe, not a TTY, so "read -p" alone would silently swallow the prompt text. Print the prompt to stderr first.
\`\`\`xml
<run_command><command>printf "Enter migration name: " >&2; read name; echo "Creating $name"</command></run_command>
\`\`\`


### Example: conversation_title — first response
**Description**: Every first response in a conversation must set a title.
\`\`\`xml
<conversation_title>Fix date formatting bug</conversation_title>
\`\`\`

### Example: conversation_title — refreshed mid-conversation
**Description**: The user pivots to an unrelated task; the title must be refreshed to reflect the new goal, not left stale.
\`\`\`xml
<conversation_title>Add slugify utility</conversation_title>
\`\`\`

## PART 2 — BATCH & MULTI-TURN WORKFLOW EXAMPLES
These show how tools are sequenced across turns. Each "Turn N" is one assistant message; tool results arrive between turns and are never predicted (NO-PREDICTING-RESULTS).

### Batch 1: Context-gathering read batch, then edit, then verify
**Description**: The canonical 3-phase cycle — read everything relevant first in one batched turn, wait for real content, then edit in a second turn, then re-read the changed region to confirm the write landed correctly.
\`\`\`xml
<!-- Turn 1: batch all relevant reads together (READ-BEFORE-EDIT, BATCH) -->
<read_file><file_path>src/features/cart/cart-store.ts</file_path></read_file>
<read_file><file_path>src/features/cart/cart-types.ts</file_path></read_file>
<read_file><file_path>src/features/cart/use-cart.ts</file_path></read_file>
<!-- STOP. Wait for all three file contents before proceeding. -->

<!-- Turn 2 (after results returned): make the edits, batched together -->
<replace_in_file>
<file_path>src/features/cart/cart-store.ts</file_path>
<old_content>function getTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price, 0);
}</old_content>
<new_content>function getTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}</new_content>
</replace_in_file>
<replace_in_file>
<file_path>src/features/cart/use-cart.ts</file_path>
<old_content>const total = getTotal(cart.items);</old_content>
<new_content>const total = getTotal(cart.items); // now quantity-aware</new_content>
</replace_in_file>
<!-- STOP. Wait for write confirmation. -->

<!-- Turn 3 (after results returned): read back the changed function to verify the byte-perfect write landed -->
<read_file><file_path>src/features/cart/cart-store.ts</file_path><start_line>1</start_line><end_line>15</end_line></read_file>
\`\`\`

### Batch 2: Explore → read → edit, for an unfamiliar module
**Description**: When a module has never been seen in this conversation (ORIENT), explore its shape first, then read the specific files it points to, only then edit. Three distinct turns, never collapsed into one.
\`\`\`xml
<!-- Turn 1: explore only — no assumptions about structure yet -->
<list_files><folder_path>src/features/notifications</folder_path><depth>2</depth></list_files>
<grep><search_term>export function send</search_term><folder_path>src/features/notifications</folder_path></grep>

<!-- Turn 2 (after results returned): read the specific files the exploration pointed to -->
<read_file><file_path>src/features/notifications/sender.ts</file_path></read_file>
<read_file><file_path>src/features/notifications/templates.ts</file_path></read_file>

<!-- Turn 3 (after results returned): now edit with full context -->
<replace_in_file>
<file_path>src/features/notifications/sender.ts</file_path>
<old_content>export function sendWelcomeEmail(user: User) {
  return send(user.email, templates.welcome);
}</old_content>
<new_content>export function sendWelcomeEmail(user: User) {
  return send(user.email, templates.welcome(user.name));
}</new_content>
</replace_in_file>
\`\`\`

### Batch 3: ROOT-CAUSE-FIX — grep every caller, fix the shared function once
**Description**: A bug report names one symptom (a crash on empty input). Instead of patching the symptom site, grep for every caller of the shared function and fix it at the source in a single batched edit turn.
\`\`\`xml
<!-- Turn 1: find the shared function and every call site -->
<grep><search_term>parseCsvRow\\(</search_term><folder_path>src</folder_path></grep>
<read_file><file_path>src/utils/csv.ts</file_path></read_file>

<!-- Turn 2 (after results returned): fix the root cause once in the shared function -->
<replace_in_file>
<file_path>src/utils/csv.ts</file_path>
<old_content>export function parseCsvRow(row: string): string[] {
  return row.split(",");
}</old_content>
<new_content>export function parseCsvRow(row: string): string[] {
  if (!row) return [];
  return row.split(",");
}</new_content>
</replace_in_file>
<!-- No changes needed at call sites — the fix at the source covers all of them. -->
\`\`\`

### Batch 4: Creating a new feature — multiple new files in one batch
**Description**: LAZY-LADDER already confirmed nothing existing covers this. Independent new files are created together in one BATCH turn, respecting WRITE-BATCH-LIMIT for the active mode.
\`\`\`xml
<!-- Turn 1: check nothing similar already exists, and find a naming convention to copy (CONVENTION-CHECK) -->
<find_files><file_name>*-store.ts</file_name><folder_path>src/features</folder_path></find_files>
<read_file><file_path>src/features/cart/cart-store.ts</file_path></read_file>

<!-- Turn 2 (after results returned): create the new feature's files together, following the copied convention -->
<write_to_file>
<file_path>src/features/wishlist/wishlist-types.ts</file_path>
<content>export interface WishlistItem {
  productId: string;
  addedAt: string;
}
</content>
</write_to_file>
<write_to_file>
<file_path>src/features/wishlist/wishlist-store.ts</file_path>
<content>import type { WishlistItem } from "./wishlist-types";

export function createWishlistStore() {
  let items: WishlistItem[] = [];
  return {
    add: (item: WishlistItem) => { items.push(item); },
    remove: (productId: string) => { items = items.filter(i => i.productId !== productId); },
    getAll: () => items,
  };
}
</content>
</write_to_file>
\`\`\`
`;



const EXAMPLE_CORE_TAIL = `
### Batch 7: Runtime bug fix — never self-declare "fixed"
**Description**: RUNTIME-VERIFY: after touching IPC/UI/runtime logic, the assistant reports what changed and explicitly asks the user to test, rather than claiming success without evidence.
\`\`\`xml
<!-- Turn 1: read the file involved in the reported crash -->
<read_file><file_path>src/main/ipc-handlers.ts</file_path></read_file>

<!-- Turn 2 (after results returned): apply the fix -->
<replace_in_file>
<file_path>src/main/ipc-handlers.ts</file_path>
<old_content>ipcMain.handle("save-file", async (_e, path, content) => {
  fs.writeFileSync(path, content);
});</old_content>
<new_content>ipcMain.handle("save-file", async (_e, path, content) => {
  try {
    fs.writeFileSync(path, content);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});</new_content>
</replace_in_file>
<!-- Deliberately does NOT say "fixed" or add a ✅ — no evidence yet that it works at runtime. -->
\`\`\`

### Batch 8: COMMAND-FAILURE handling — dependency error
**Description**: run_command returns a non-zero exit code. stderr is analyzed first; a dependency error is diagnosed and a fix proposed, rather than blindly retrying.
\`\`\`xml
<!-- Turn 1 -->
<run_command><command>npm run build</command></run_command>
<!-- Result: "Error - Exit code 1" with stderr showing "Cannot find module 'zod'" -->

<!-- Turn 2 (after result returned): dependency error identified, propose the fix -->
<run_command><command>npm install zod</command></run_command>
<!-- STOP. Wait for install result before re-running the build. -->
\`\`\`

### Batch 9: EDIT-SAFETY — replace_in_file fails twice, re-read before retrying
**Description**: A replace_in_file call fails because old_content no longer matches exactly (file changed since last read). After a second consecutive failure on the same file, re-read it instead of guessing at the content again.
\`\`\`xml
<!-- Turn 1: first replace_in_file attempt fails — old_content mismatch -->
<!-- Turn 2: second attempt, still adjusted slightly, also fails -->
<!-- Turn 3: stop guessing, re-read the file to get its true current content -->
<read_file><file_path>src/features/settings/settings-panel.tsx</file_path></read_file>
<!-- STOP. Only after seeing the fresh content does the next replace_in_file get written. -->
\`\`\`



### Batch 16: READ-LINE-BUDGET — using file line-count metadata to trim a read batch
**Description**: grep/find_files/list_files return an exact line count per file. Before batching read_file calls, that count is summed against the fixed 1500-line-per-turn budget; oversized files are read as a slice (start_line/end_line) instead of being read whole, rather than being silently dropped. There is no cap on the NUMBER of files read here — three files are read in one batch below purely because that's what the task needs and the total stays under 1500 lines, not because of any file-count limit.
\`\`\`xml
<!-- Turn 1: explore — grep returns an exact line count alongside each match -->
<grep><search_term>class OrderProcessor</search_term><folder_path>src/features/orders</folder_path></grep>
<!-- Result: order-processor.ts (1200 lines) matches at line 640; order-types.ts (80 lines) and order-utils.ts (150 lines) also match -->

<!-- Turn 2 (after results returned): reading order-processor.ts whole (1200) + the other two whole (80+150) = 1430 lines, under the 1500 budget, so all three are read as-is -->
<read_file><file_path>src/features/orders/order-processor.ts</file_path></read_file>
<read_file><file_path>src/features/orders/order-types.ts</file_path></read_file>
<read_file><file_path>src/features/orders/order-utils.ts</file_path></read_file>
\`\`\`

### Batch 17: READ-LINE-BUDGET — a single file alone exceeds the budget
**Description**: One matching file is larger than the whole 1500-line budget by itself. Instead of skipping it or reading it whole and blowing the budget, only the relevant slice around the match is read.
\`\`\`xml
<!-- Turn 1 -->
<grep><search_term>function legacyMigrate</search_term><folder_path>src/scripts</folder_path></grep>
<!-- Result: migrate-legacy.ts (3400 lines) matches at line 2210 -->

<!-- Turn 2 (after result returned): 3400 lines alone exceeds the 1500 budget, so read only a slice around the match instead of the whole file -->
<read_file><file_path>src/scripts/migrate-legacy.ts</file_path><start_line>2150</start_line><end_line>2300</end_line></read_file>
\`\`\`

### Example: send_message — final RESULT to the orchestrator
**Description**: Only after real tool results confirm the work, hand off with ONE send_message as the LAST call of the turn. The message is self-contained.
\`\`\`xml
<send_message>
<agent_id>orchestrator</agent_id>
<message>TYPE: RESULT
STATUS: OK
BODY:
1. DONE: step 1 done (getTotal now multiplies price by quantity).
2. FILES CHANGED: src/features/cart/cart-store.ts — getTotal reducer.
3. CHECKS RUN: npx tsc --noEmit → exit code 0, no output.
4. OPEN ISSUES: cart total on screen should be checked manually in the UI.</message>
</send_message>
\`\`\`

### Example: send_message — PLAN contradicts the real code, so BLOCKED (no improvising)
\`\`\`xml
<send_message>
<agent_id>orchestrator</agent_id>
<message>TYPE: RESULT
STATUS: BLOCKED
BODY:
1. DONE: none; stopped before editing.
2. BLOCKER: PLAN step 1 says to edit getTotal at src/features/cart/cart-store.ts lines 52-54, but the file has no getTotal; the function is calculateTotal in src/features/cart/totals.ts (found with grep).
3. NEED: confirmation that the PLAN should target calculateTotal instead.</message>
</send_message>
\`\`\`

`;

// ─── JSON FORMAT EXAMPLES ────────────────────────────────────────────────────
// In JSON mode, EVERYTHING is a JSON object in its own fenced ```json block:
//   - Tool call:  {"tool":"...","params":{...}}
// No XML tags of any kind appear in this section.

const EXAMPLE_HEADER_AND_CORE_JSON = `# EXAMPLES (JSON FORMAT)
This section shows how each tool is used correctly in JSON format, and how tools are combined into realistic multi-turn batches. Titles and descriptions are for your reference only — never output them to the user. Each object is a single JSON value inside its own fenced \`\`\`json block, per the schema defined in TOOLS REFERENCE and TOOL VALIDATION.

> **100% JSON**: In JSON mode there is NO XML — not even tool tags. Everything is a JSON object with a \`"tool"\` key. Never emit \`<read_file>\` or any other \`<...>\` tag.

## PART 1 — SINGLE-TOOL EXAMPLES

### Example: read_file — whole file
**Description**: Reading a small file completely before editing it, per READ-BEFORE-EDIT.
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/utils/format.ts"}}
\`\`\`

### Example: read_file — line range
**Description**: A file is large (>500 lines) and only one function is relevant. Narrow the read instead of pulling the whole file.
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/server/router.ts","start_line":120,"end_line":180}}
\`\`\`

### Example: write_to_file — new file
**Description**: Creating a brand-new file that does not exist yet. Always use write_to_file for creation, never replace_in_file.
\`\`\`json
{"tool":"write_to_file","params":{"file_path":"src/utils/slugify.ts","content":"export function slugify(input: string): string {\\n  return input\\n    .trim()\\n    .toLowerCase()\\n    .replace(/[^a-z0-9]+/g, \\"-\\")\\n    .replace(/(^-|-$)/g, \\"\\");\\n}\\n"}}
\`\`\`

### Example: replace_in_file — targeted edit
**Description**: old_content must be an exact, byte-perfect excerpt of the file just read — same indentation, same whitespace. Only the minimal changed region is included.
\`\`\`json
{"tool":"replace_in_file","params":{"file_path":"src/utils/format.ts","old_content":"export function formatDate(date: Date): string {\\n  return date.toISOString();\\n}","new_content":"export function formatDate(date: Date): string {\\n  return date.toISOString().split(\\"T\\")[0];\\n}"}}
\`\`\`

### Example: list_files — shallow
**Description**: Getting a quick top-level orientation of a folder before deciding where to dig deeper.
\`\`\`json
{"tool":"list_files","params":{"folder_path":"src/features/chat"}}
\`\`\`

### Example: list_files — deep
**Description**: Need the full subtree of a feature folder to understand module boundaries before a larger refactor.
\`\`\`json
{"tool":"list_files","params":{"folder_path":"src/features/chat","depth":"max"}}
\`\`\`

### Example: find_files — by exact name
**Description**: Locating a specific file across the whole workspace when its folder is unknown.
\`\`\`json
{"tool":"find_files","params":{"file_name":"vite.config.ts"}}
\`\`\`

### Example: find_files — by pattern, scoped
**Description**: Finding all test files inside one folder, rather than the entire repo, to keep results relevant.
\`\`\`json
{"tool":"find_files","params":{"file_name":"*.test.ts","folder_path":"src/features/auth"}}
\`\`\`

### Example: grep — single file
**Description**: Checking every usage of a function inside one known file before renaming it locally.
\`\`\`json
{"tool":"grep","params":{"search_term":"formatDate\\\\(","file_path":"src/utils/format.ts"}}
\`\`\`

### Example: grep — folder-wide, PATTERN-REUSE
**Description**: Before fixing a bug, checking whether the same faulty pattern exists elsewhere in the codebase so all instances get fixed together.
\`\`\`json
{"tool":"grep","params":{"search_term":"catch\\\\s*\\\\(\\\\s*e\\\\s*\\\\)\\\\s*\\\\{\\\\s*\\\\}","folder_path":"src"}}
\`\`\`

### Example: delete_file
**Description**: Removing a file that is fully superseded by a new module. Ask the orchestrator first if this could be considered destructive/irreversible under the active mode.
\`\`\`json
{"tool":"delete_file","params":{"file_path":"src/utils/legacy-format.ts"}}
\`\`\`

### Example: run_command — safe, non-destructive
**Description**: Installing a dependency needed for the current task.
\`\`\`json
{"tool":"run_command","params":{"command":"npm install date-fns"}}
\`\`\`

### Example: run_command — scoped to a subfolder
**Description**: Running a script that only makes sense from inside a specific package/workspace folder.
\`\`\`json
{"tool":"run_command","params":{"command":"npm run build","folder_path":"src/webview-ui"}}
\`\`\`

### Example: run_command — interactive prompt written correctly
**Description**: stdin is a pipe, not a TTY, so "read -p" alone would silently swallow the prompt text. Print the prompt to stderr first.
\`\`\`json
{"tool":"run_command","params":{"command":"printf \\"Enter migration name: \\" >&2; read name; echo \\"Creating $name\\""}}
\`\`\`


### Example: conversation_title — first response
**Description**: Every first response in a conversation must set a title. In JSON mode, conversation_title is a JSON tool call.
\`\`\`json
{"tool":"conversation_title","params":{"title":"Fix date formatting bug"}}
\`\`\`

### Example: conversation_title — refreshed mid-conversation
**Description**: The user pivots to an unrelated task; the title must be refreshed to reflect the new goal, not left stale.
\`\`\`json
{"tool":"conversation_title","params":{"title":"Add slugify utility"}}
\`\`\`

## PART 2 — BATCH & MULTI-TURN WORKFLOW EXAMPLES
These show how tools are sequenced across turns. Each "Turn N" is one assistant message; tool results arrive between turns and are never predicted (NO-PREDICTING-RESULTS).

### Batch 1: Context-gathering read batch, then edit, then verify
**Description**: The canonical 3-phase cycle — read everything relevant first in one batched turn, wait for real content, then edit in a second turn, then re-read the changed region to confirm the write landed correctly.
Turn 1 — batch all relevant reads together (READ-BEFORE-EDIT, BATCH). A short prose line first, then the reads:
\`\`\`json
\`\`\`
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/features/cart/cart-store.ts"}}
\`\`\`
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/features/cart/cart-types.ts"}}
\`\`\`
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/features/cart/use-cart.ts"}}
\`\`\`
STOP. Wait for all three file contents before proceeding.

Turn 2 — after results returned, make the edits together:
\`\`\`json
\`\`\`
\`\`\`json
{"tool":"replace_in_file","params":{"file_path":"src/features/cart/cart-store.ts","old_content":"function getTotal(items: CartItem[]): number {\\n  return items.reduce((sum, i) => sum + i.price, 0);\\n}","new_content":"function getTotal(items: CartItem[]): number {\\n  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);\\n}"}}
\`\`\`
\`\`\`json
{"tool":"replace_in_file","params":{"file_path":"src/features/cart/use-cart.ts","old_content":"const total = getTotal(cart.items);","new_content":"const total = getTotal(cart.items); // now quantity-aware"}}
\`\`\`
STOP. Wait for write confirmation.

Turn 3 — after results returned, verify the write:
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/features/cart/cart-store.ts","start_line":1,"end_line":15}}
\`\`\`

### Batch 2: Explore → read → edit, for an unfamiliar module
**Description**: When a module has never been seen in this conversation (ORIENT), explore its shape first, then read the specific files it points to, only then edit. Three distinct turns, never collapsed into one.
Turn 1 — explore only, no assumptions about structure yet:
\`\`\`json
{"tool":"list_files","params":{"folder_path":"src/features/notifications","depth":2}}
\`\`\`
\`\`\`json
{"tool":"grep","params":{"search_term":"export function send","folder_path":"src/features/notifications"}}
\`\`\`

Turn 2 — after results returned, read the specific files the exploration pointed to:
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/features/notifications/sender.ts"}}
\`\`\`
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/features/notifications/templates.ts"}}
\`\`\`

Turn 3 — after results returned, now edit with full context:
\`\`\`json
{"tool":"replace_in_file","params":{"file_path":"src/features/notifications/sender.ts","old_content":"export function sendWelcomeEmail(user: User) {\\n  return send(user.email, templates.welcome);\\n}","new_content":"export function sendWelcomeEmail(user: User) {\\n  return send(user.email, templates.welcome(user.name));\\n}"}}
\`\`\`

### Batch 3: ROOT-CAUSE-FIX — grep every caller, fix the shared function once
**Description**: A bug report names one symptom. Instead of patching the symptom site, grep for every caller of the shared function and fix it at the source in a single batched edit turn.
Turn 1 — find the shared function and every call site:
\`\`\`json
{"tool":"grep","params":{"search_term":"parseCsvRow\\\\(","folder_path":"src"}}
\`\`\`
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/utils/csv.ts"}}
\`\`\`

Turn 2 — after results returned, fix at root:
\`\`\`json
{"tool":"replace_in_file","params":{"file_path":"src/utils/csv.ts","old_content":"export function parseCsvRow(row: string): string[] {\\n  return row.split(\\",\\");\\n}","new_content":"export function parseCsvRow(row: string): string[] {\\n  if (!row) return [];\\n  return row.split(\\",\\");\\n}"}}
\`\`\`
No changes needed at call sites — the fix at the source covers all of them.

### Batch 4: Creating a new feature — multiple new files in one batch
**Description**: LAZY-LADDER already confirmed nothing existing covers this. Independent new files are created together in one BATCH turn, respecting WRITE-BATCH-LIMIT.
Turn 1 — check nothing similar already exists, and find a naming convention to copy (CONVENTION-CHECK):
\`\`\`json
{"tool":"find_files","params":{"file_name":"*-store.ts","folder_path":"src/features"}}
\`\`\`
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/features/cart/cart-store.ts"}}
\`\`\`

Turn 2 — after results returned, create the new feature's files together, following the copied convention:
\`\`\`json
{"tool":"write_to_file","params":{"file_path":"src/features/wishlist/wishlist-types.ts","content":"export interface WishlistItem {\\n  productId: string;\\n  addedAt: string;\\n}\\n"}}
\`\`\`
\`\`\`json
{"tool":"write_to_file","params":{"file_path":"src/features/wishlist/wishlist-store.ts","content":"import type { WishlistItem } from \\"./wishlist-types\\";\\n\\nexport function createWishlistStore() {\\n  let items: WishlistItem[] = [];\\n  return {\\n    add: (item: WishlistItem) => { items.push(item); },\\n    remove: (productId: string) => { items = items.filter(i => i.productId !== productId); },\\n    getAll: () => items,\\n  };\\n}\\n"}}
\`\`\`
`;



const EXAMPLE_CORE_TAIL_JSON = `
### Batch 7: Runtime bug fix — never self-declare "fixed"
**Description**: RUNTIME-VERIFY: after touching IPC/UI/runtime logic, the assistant reports what changed and explicitly asks the user to test, rather than claiming success without evidence.
Turn 1 — read the file involved in the reported crash:
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/main/ipc-handlers.ts"}}
\`\`\`

Turn 2 — after results returned, apply the fix:
\`\`\`json
{"tool":"replace_in_file","params":{"file_path":"src/main/ipc-handlers.ts","old_content":"ipcMain.handle(\\"save-file\\", async (_e, path, content) => {\\n  fs.writeFileSync(path, content);\\n});","new_content":"ipcMain.handle(\\"save-file\\", async (_e, path, content) => {\\n  try {\\n    fs.writeFileSync(path, content);\\n    return { ok: true };\\n  } catch (err) {\\n    return { ok: false, error: String(err) };\\n  }\\n});"}}
\`\`\`
\`\`\`json
\`\`\`
Do NOT declare "fixed" without runtime confirmation. No ✅.

### Batch 8: COMMAND-FAILURE handling — dependency error
**Description**: run_command returns a non-zero exit code. stderr is analyzed first; a dependency error is diagnosed and a fix proposed, rather than blindly retrying.
Turn 1:
\`\`\`json
{"tool":"run_command","params":{"command":"npm run build"}}
\`\`\`
Result: "Error - Exit code 1" with stderr showing "Cannot find module 'zod'".

Turn 2 — after result returned, dependency error identified, propose the fix:
\`\`\`json
\`\`\`
\`\`\`json
{"tool":"run_command","params":{"command":"npm install zod"}}
\`\`\`
STOP. Wait for install result before re-running the build.

### Batch 9: EDIT-SAFETY — replace_in_file fails twice, re-read before retrying
**Description**: A replace_in_file call fails because old_content no longer matches exactly (file changed since last read). After a second consecutive failure on the same file, re-read it instead of guessing at the content again.
Turn 1 — first replace_in_file attempt fails (old_content mismatch).
Turn 2 — second attempt, still adjusted slightly, also fails.
Turn 3 — stop guessing, re-read the file to get its true current content:
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/features/settings/settings-panel.tsx"}}
\`\`\`
STOP. Only after seeing the fresh content does the next replace_in_file get written.



### Batch 16: READ-LINE-BUDGET — using file line-count metadata to trim a read batch
**Description**: grep/find_files/list_files return an exact line count per file. Before batching read_file calls, that count is summed against the fixed 1500-line-per-turn budget; oversized files are read as a slice instead of being read whole. There is no cap on the NUMBER of files read here.
Turn 1 — explore; grep returns an exact line count alongside each match:
\`\`\`json
{"tool":"grep","params":{"search_term":"class OrderProcessor","folder_path":"src/features/orders"}}
\`\`\`
Result: order-processor.ts (1200 lines) matches at line 640; order-types.ts (80 lines) and order-utils.ts (150 lines) also match. Sum = 1430 lines, under the 1500 budget.

Turn 2 — after results returned, read all three whole (1200+80+150 = 1430):
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/features/orders/order-processor.ts"}}
\`\`\`
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/features/orders/order-types.ts"}}
\`\`\`
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/features/orders/order-utils.ts"}}
\`\`\`

### Batch 17: READ-LINE-BUDGET — a single file alone exceeds the budget
**Description**: One matching file is larger than the whole 1500-line budget by itself. Instead of skipping it or blowing the budget, only the relevant slice around the match is read.
Turn 1:
\`\`\`json
{"tool":"grep","params":{"search_term":"function legacyMigrate","folder_path":"src/scripts"}}
\`\`\`
Result: migrate-legacy.ts (3400 lines) matches at line 2210. 3400 > 1500 → read only the slice.

Turn 2 — after result returned:
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/scripts/migrate-legacy.ts","start_line":2150,"end_line":2300}}
\`\`\`

### Example: send_message — final RESULT to the orchestrator
**Description**: Only after real tool results confirm the work, hand off with ONE send_message as the LAST call of the turn. The message is self-contained.
\`\`\`json
{"tool":"send_message","params":{"agent_id":"orchestrator","message":"TYPE: RESULT\\nSTATUS: OK\\nBODY:\\n1. DONE: step 1 done (getTotal now multiplies price by quantity).\\n2. FILES CHANGED: src/features/cart/cart-store.ts — getTotal reducer.\\n3. CHECKS RUN: npx tsc --noEmit → exit code 0, no output.\\n4. OPEN ISSUES: cart total on screen should be checked manually in the UI."}}
\`\`\`

### Example: send_message — PLAN contradicts the real code, so BLOCKED (no improvising)
\`\`\`json
{"tool":"send_message","params":{"agent_id":"orchestrator","message":"TYPE: RESULT\\nSTATUS: BLOCKED\\nBODY:\\n1. DONE: none; stopped before editing.\\n2. BLOCKER: PLAN step 1 says to edit getTotal at src/features/cart/cart-store.ts lines 52-54, but the file has no getTotal; the function is calculateTotal in src/features/cart/totals.ts (found with grep).\\n3. NEED: confirmation that the PLAN should target calculateTotal instead."}}
\`\`\`

`;

export const buildExecutorExample = (
  toolFormat: ToolFormat = "xml",
): string =>
  toolFormat === "json"
    ? EXAMPLE_HEADER_AND_CORE_JSON + EXAMPLE_CORE_TAIL_JSON
    : EXAMPLE_HEADER_AND_CORE + EXAMPLE_CORE_TAIL;
