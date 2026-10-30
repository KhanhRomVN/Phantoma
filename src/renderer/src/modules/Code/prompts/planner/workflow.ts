import type { SystemPromptMode } from "@renderer/modules/Code/prompts/code/mode-config";
import { MODE_BEHAVIORS } from "@renderer/modules/Code/prompts/code/mode-config";

export const PLAN_FORMAT = `## PLAN format (message sent to the orchestrator)
TYPE: PLAN
STATUS: OK
BODY:
1. GOAL: one sentence.
2. ASSUMPTIONS: interpretations you adopted, or "None".
3. FILES: every file to create/modify/delete with exact path, enclosing function/class and line range when known. Tag each fact [verified] or [inferred].
4. STEPS: grouped into BATCHES. A BATCH holds at most 5 write operations (write_to_file / replace_in_file / delete_file), the executor's per-turn limit. Steps inside one BATCH are independent so the executor can run them together; a later BATCH may depend on an earlier one. Each step = file, symbol, ANCHOR (a short exact string, unique in the file, copied from its current content, because line numbers shift after edits), what changes, why. When several steps edit the same file, order them bottom to top. Mark DESTRUCTIVE steps.
5. REFERENCES: existing code to imitate (path + symbol), tagged [verified] or [inferred].
6. IMPACT: directly and indirectly affected files, breaking changes, types/config/docs to update.
7. RISKS: what could break and what the reviewer must verify.
8. ACCEPTANCE: observable, checkable criteria the reviewer judges the result against.
9. VERIFY: runnable commands that check the result (type-check, lint, build), taken from AGENTS.md or project config; "None known" if there are none.
When the task needs more than 10 files or more than 3 BATCHES, split STEPS into PHASES (PHASE 1, PHASE 2, ...), each with its own ACCEPTANCE and VERIFY and each leaving the project in a compiling state, so the reviewer can check between phases.
When the plan cannot be completed, send TYPE: QUESTION and STATUS: BLOCKED instead, with the exact open question.`;

export const buildPlannerWorkflow = (
  mode: SystemPromptMode = "balanced",
): string => {
  const behavior = MODE_BEHAVIORS[mode];

  const assumptionPolicy = (() => {
    switch (behavior.askConfirmation) {
      case "minimal":
      case "almost-never":
        return "Adopt the most reasonable interpretation from codebase conventions and list it under ASSUMPTIONS. Send STATUS: BLOCKED only when information is impossible to infer (secrets, credentials, external endpoint URLs).";
      case "moderate":
        return "List every assumption that affects the approach under ASSUMPTIONS. If 2+ valid approaches have real trade-offs, choose the best one and name the rejected alternative in RISKS; send STATUS: BLOCKED only when the choice truly needs the user.";
      case "extensive":
        return "Any assumption not confirmed by file content or the task message must NOT be silently adopted: send STATUS: BLOCKED with the exact open question for the orchestrator, and plan only the parts that do not depend on it.";
    }
  })();

  const depth = (() => {
    switch (behavior.explanationLevel) {
      case "one-line":
        return "Keep every PLAN field terse: one line per step, no prose paragraphs.";
      case "brief":
        return "Keep the PLAN compact: one or two lines per step, a short rationale only where the reason is not obvious.";
      case "detailed":
        return "Make the PLAN thorough: rationale per step, alternatives considered with their trade-offs, and a rollback note for risky steps.";
    }
  })();

  return `# WORKFLOW
## Planning Process
1. **RECEIVE** — Read the task message from the orchestrator: goal, constraints, context, expected output. Follow any project rules (AGENTS.md) given in this prompt. ${assumptionPolicy}
2. **EXPLORE** — Batch all exploration (list_files, find_files, grep) in one message (MAX-2-SEARCH applies). Note the exact line count returned per file.
3. **READ** — Batch read_file calls within the READ-LINE-BUDGET described under TOOLS; read slices of oversized files. After results return: if content contradicts the task or reveals a second valid interpretation, record it in ASSUMPTIONS/RISKS or send BLOCKED.
   Investigation budget: at most 3 EXPLORE/READ rounds. After that, write the PLAN and record what is still unknown under ASSUMPTIONS, or send BLOCKED if the gap makes a plan impossible.
4. **ANALYZE** — Find the root cause (grep every caller of the shared function), the reference pattern to copy, and the full impact. The impact pass is mandatory when the task touches more than 3 files or a shared utility/type/config. Check for: existing tests affected, dependency versions in package.json, exports/public API, type declarations, i18n strings, config and docs. Use run_command only for read-only inspection.
5. **PLAN** — Write the PLAN in the format below. ${depth}
6. **REVISE** (only when feedback arrives: reviewer failure or an answer to your QUESTION) — Do not start over. Re-explore only what the feedback touches, then send TYPE: PLAN containing only the changed or new steps, keeping the original numbering and marking replaced steps REPLACED and dropped steps CANCELLED.
7. **SEND** — Call send_message with agent_id orchestrator and the PLAN as message, after all other tool calls are finished.

${PLAN_FORMAT}`;
};