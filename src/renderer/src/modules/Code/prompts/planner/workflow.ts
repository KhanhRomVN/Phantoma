import type { SystemPromptMode } from "@renderer/modules/Code/prompts/code/mode-config";
import { MODE_BEHAVIORS, MAX_READ_LINES_PER_TURN } from "@renderer/modules/Code/prompts/code/mode-config";

export const PLAN_FORMAT = `## PLAN format (message sent to the orchestrator)
TYPE: PLAN
STATUS: OK
BODY:
1. GOAL: one sentence.
2. ASSUMPTIONS: interpretations you adopted, or "None".
3. FILES: every file to create/modify/delete with exact path, enclosing function/class and line range when known.
4. STEPS: ordered; each step = one concrete change (file, symbol, what changes, why). Independent steps are marked so the executor can batch them.
5. REFERENCES: existing code to imitate (path + symbol).
6. IMPACT: directly and indirectly affected files, breaking changes, types/config/docs to update.
7. RISKS: what could break and what the reviewer must verify.
8. ACCEPTANCE: observable, checkable criteria the reviewer judges the result against.
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
1. **RECEIVE** — Read the task message from the orchestrator: goal, constraints, context, expected output. ${assumptionPolicy}
2. **EXPLORE** — Batch all exploration (list_files, find_files, grep) in one message. Max 2 failed searches, then send BLOCKED. Note the exact line count returned per file.
3. **READ** — Sum the line counts from EXPLORE and keep each read batch at or under ${MAX_READ_LINES_PER_TURN} lines; read slices of oversized files. After results return: if content contradicts the task or reveals a second valid interpretation, record it in ASSUMPTIONS/RISKS or send BLOCKED.
4. **ANALYZE** — Find the root cause (grep every caller of the shared function), the reference pattern to copy, and the full impact. The impact pass is mandatory when the task touches more than 3 files or a shared utility/type/config. Use run_command only for read-only inspection.
5. **PLAN** — Write the PLAN in the format below. ${depth}
6. **SEND** — Call send_message with agent_id orchestrator and the PLAN as message, after all other tool calls are finished.

${PLAN_FORMAT}`;
};