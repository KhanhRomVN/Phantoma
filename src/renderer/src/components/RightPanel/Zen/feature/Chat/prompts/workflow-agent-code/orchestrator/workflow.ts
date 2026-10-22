import type { SystemPromptMode } from "../../code/mode-config";
import { MODE_BEHAVIORS } from "../../code/mode-config";
import type { ToolFormat } from "../shared/types";
import { callText, tick } from "../shared/tool-catalog";

export const MAX_REWORK_ROUNDS = 3;

export const buildOrchestratorWorkflow = (
  mode: SystemPromptMode = "balanced",
  toolFormat: ToolFormat = "xml",
): string => {
  const behavior = MODE_BEHAVIORS[mode];

  const askPolicy = (() => {
    switch (behavior.askConfirmation) {
      case "minimal":
        return "Ask the user only when it is IMPOSSIBLE to proceed without them (missing credential, unknown endpoint URL, ambiguous goal with no default). Otherwise pick the most reasonable interpretation from codebase conventions and state it in the TASK handoff.";
      case "moderate":
        return "Ask the user when 2+ valid approaches have real trade-offs, when the change touches more than 3 files or a shared module, or when the goal is ambiguous. Minor assumptions follow existing patterns silently.";
      case "extensive":
        return "Ask the user about EVERY unverified assumption before delegating. Any assumption not confirmed by file content or an explicit user statement must be confirmed first.";
      case "almost-never":
        return "Do not ask about assumptions. Adopt the most reasonable interpretation and record it in the TASK handoff. Only ask for destructive operations or information impossible to infer (secrets, credentials, external endpoints).";
    }
  })();

  const routeRule =
    mode === "thorough"
      ? "Always route through the planner, even for small changes."
      : "A trivial request (single file, obvious change, existing pattern to copy) may skip the planner: send the executor a TASK that already contains the exact change. Everything else goes planner → executor → reviewer.";

  const readMemory = tick(callText("read_memory", {}, toolFormat));
  const updateMemory = tick(
    callText(
      "update_memory",
      { old_content: "...", new_content: "..." },
      toolFormat,
    ),
  );

  return `# WORKFLOW
## Orchestration Loop
1. **INTAKE** — Restate the user's request as one precise goal. Identify target files/folders. ${askPolicy}
2. **CONTEXT** — Batch light exploration (list_files, grep, find_files, then read_file within READ-LINE-BUDGET) only to make the handoff precise. Do not investigate root causes: that is the planner's job.
3. **ROUTE** — ${routeRule}
4. **PLAN** — Send the planner a TASK handoff. Check the returned PLAN: it must list files, ordered steps, references and ACCEPTANCE criteria. If incomplete, send it back once with the missing items named.
5. **EXECUTE** — Send the executor the approved PLAN (TYPE: PLAN) with the user's constraints.
6. **REVIEW** — Send the reviewer the executor's RESULT together with the PLAN it must be checked against.
7. **REWORK** — If the verdict is NEEDS_REWORK, forward only the concrete DEFECTS to the executor, then review again. Maximum ${MAX_REWORK_ROUNDS} rework rounds; after that send the user an ESCALATION that lists what still fails.
8. **REPORT** — Merge the reviewer's verdict into the final reply to the user (see EXPLANATION-LEVEL in CONSTRAINTS). Never self-declare a runtime/UI bug fixed: ask the user to test.

If any agent returns STATUS: BLOCKED, resolve it yourself when you can; otherwise ask the user one precise question through an ESCALATION handoff addressed to the user, then wait.

# MEMORY (when enabled)
When Memory is on, the global memory file is already appended to your system prompt under a "# Memory" heading, so do NOT re-read it. Only the orchestrator manages memory. Record only durable, cross-project user preferences or corrections (never secrets, never task state). Always call ${readMemory} immediately before ${updateMemory}, because update_memory needs an exact old_content (empty only for the first write).`;
};