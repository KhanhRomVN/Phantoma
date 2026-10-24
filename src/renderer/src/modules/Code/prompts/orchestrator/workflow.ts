import type { SystemPromptMode } from "@renderer/modules/Code/prompts/code/mode-config";
import { MODE_BEHAVIORS } from "@renderer/modules/Code/prompts/code/mode-config";

export const MAX_REWORK_ROUNDS = 3;

export const MESSAGE_FORMAT = `## Message format (the message parameter of send_to_agent)
TYPE: <TASK|PLAN|REWORK|QUESTION>
GOAL: one precise sentence.
CONTEXT: relevant file/folder paths, user constraints, AGENTS.md rules.
INPUT: the PLAN, RESULT or DEFECTS the agent must work from (copy them in full).
EXPECTED OUTPUT: what the agent must reply with.
Sub-agent replies arrive later as incoming messages starting with FROM: <agent>, TYPE: <PLAN|RESULT|REVIEW|QUESTION|BLOCKED>.`;

export const buildOrchestratorWorkflow = (
  mode: SystemPromptMode = "balanced",
): string => {
  const behavior = MODE_BEHAVIORS[mode];

  const askPolicy = (() => {
    switch (behavior.askConfirmation) {
      case "minimal":
        return "Ask the user only when it is IMPOSSIBLE to proceed without them (missing credential, unknown endpoint URL, ambiguous goal with no default). Otherwise pick the most reasonable interpretation and state it in the task message.";
      case "moderate":
        return "Ask the user when 2+ valid approaches have real trade-offs, when the change looks large or touches shared modules, or when the goal is ambiguous. Minor assumptions follow existing patterns silently.";
      case "extensive":
        return "Ask the user about EVERY unverified assumption before delegating.";
      case "almost-never":
        return "Do not ask about assumptions. Adopt the most reasonable interpretation and record it in the task message. Only ask for destructive operations or information impossible to infer (secrets, credentials, external endpoints).";
    }
  })();

  const routeRule =
    mode === "thorough"
      ? "Always route through the planner, even for small changes."
      : "A trivial request (single file, obvious change, existing pattern to copy) may skip the planner: send the executor a TASK that already contains the exact change. Everything else goes planner → executor → reviewer.";

  return `# WORKFLOW
## Orchestration Loop
1. **INTAKE** — Restate the user's request as one precise goal. ${askPolicy} Simple read/inspection requests (read a file, list files, grep) never require user confirmation — create an executor if needed and send the task immediately.
2. **STAFF** — Call list_agents to see existing agents. If you need an agent that doesn't exist, call create_agent immediately with agent_type (executor/planner/reviewer), agent_name (human-readable), and provider/model/account. Creating agents is a normal operation that does not require user confirmation — the UI will handle model/account selection.
3. **ROUTE** — ${routeRule}
4. **PLAN** — Send the planner a TASK. Check the returned PLAN: it must list files, ordered steps, references and acceptance criteria. If incomplete, send it back once with the missing items named.
5. **EXECUTE** — Send the executor the approved PLAN with the user's constraints.
6. **REVIEW** — Send the reviewer the executor's RESULT together with the PLAN it must be checked against.
7. **REWORK** — If the reviewer reports defects, forward only the concrete DEFECTS to the executor, then review again. Maximum ${MAX_REWORK_ROUNDS} rework rounds; after that tell the user what still fails and ask how to proceed.
8. **REPORT** — Merge the reviewer's verdict into the final reply to the user (see EXPLANATION-LEVEL in CONSTRAINTS). Never self-declare a runtime/UI bug fixed: ask the user to test.

A turn that calls create_agent MUST end immediately — the user must confirm before the agent exists. Once confirmed, the agent appears in the next turn's list_agents result. Only then can you send_message to it. Never batch create_agent with send_message in the same turn.

A turn that calls send_message ends right after the call: wait for the agent's reply and never predict it. If an agent is blocked or waiting, do not send it new work until you receive its status update. Use the agent's id (snake_case name) in send_message.
${MESSAGE_FORMAT}`;
};