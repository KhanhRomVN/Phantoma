import type { SystemPromptMode } from "@renderer/modules/Code/prompts/code/mode-config";
import { MODE_BEHAVIORS } from "@renderer/modules/Code/prompts/code/mode-config";

export const MAX_REWORK_ROUNDS = 3;

export const MESSAGE_FORMAT = `## Message format (the message parameter of send_message)
TYPE: <TASK|PLAN|REWORK|QUESTION>
GOAL: one precise sentence.
CONTEXT: relevant file/folder paths, user constraints, AGENTS.md rules.
INPUT: the PLAN, RESULT or DEFECTS the agent must work from (copy them in full), or "none".
EXPECTED OUTPUT: what the agent must reply with.
TYPE meaning: TASK = new work; PLAN = an approved plan to execute; REWORK = defects to fix; QUESTION = your answer to an agent's question.
Agent replies arrive later as incoming messages: FROM: <agent>, TO: orchestrator, TYPE: <PLAN|RESULT|REVIEW|QUESTION>, STATUS: <OK|BLOCKED|NEEDS_REWORK>, BODY: <content>.`;

export const buildOrchestratorWorkflow = (
  mode: SystemPromptMode = "balanced",
): string => {
  const behavior = MODE_BEHAVIORS[mode];

  const askPolicy = (() => {
    switch (behavior.askConfirmation) {
      case "minimal":
        return "Ask the user only when it is IMPOSSIBLE to proceed without them (missing credential, unknown endpoint URL, ambiguous goal with no default). Otherwise pick the most reasonable interpretation and state it in CONTEXT.";
      case "moderate":
        return "Ask the user when 2+ valid approaches have real trade-offs, when the change looks large or touches shared modules, or when the goal is ambiguous. Minor assumptions follow existing patterns silently.";
      case "extensive":
        return "Ask the user about EVERY unverified assumption before delegating.";
      case "almost-never":
        return "Do not ask about assumptions. Adopt the most reasonable interpretation and record it in CONTEXT. Only ask for destructive operations or information impossible to infer (secrets, credentials, external endpoints).";
    }
  })();

  const routeRule =
    mode === "thorough"
      ? "Always route through the planner, even for small changes."
      : "A trivial request (single file, obvious change, existing pattern to copy) may skip the planner: send the executor a TASK that already contains the exact change, and put 1-3 checkable ACCEPTANCE criteria in CONTEXT so the reviewer has something to judge against. Everything else goes planner → executor → reviewer.";

  return `# WORKFLOW
## Orchestration Loop
1. **INTAKE** — Restate the user's request as one precise goal. ${askPolicy} Questions to the user go through the question UI. Simple read/inspection requests (read a file, list files, grep) never need confirmation: staff an executor if needed and send the task at once.
2. **STAFF** — Call list_agents. Reuse an idle agent of the right type; never create a duplicate. If the agent you need is working, waiting or blocked, send it no new work until its status update arrives. If no agent of the needed type exists, call create_agent (agent_type and agent_name only) and end the turn: the agent exists from a later turn, which you confirm with list_agents before send_message.
3. **ROUTE** — ${routeRule}
4. **PLAN** — Send the planner a TASK. Check the returned PLAN: it must list files, ordered steps, references and acceptance criteria. If incomplete, send it back once with the missing items named.
5. **EXECUTE** — Send the executor the approved PLAN (TYPE: PLAN) with the user's constraints.
6. **REVIEW** — Send the reviewer a TASK whose INPUT holds the executor's RESULT together with the PLAN it must be checked against.
7. **REWORK** — If the reviewer reports defects, forward only the concrete DEFECTS to the executor (TYPE: REWORK), then review again. Maximum ${MAX_REWORK_ROUNDS} rework rounds; after that tell the user what still fails and ask how to proceed.
8. **REPORT** — Merge the reviewer's verdict into the final reply to the user (see EXPLANATION-LEVEL in CONSTRAINTS). Never self-declare a runtime/UI bug fixed: ask the user to test.

## Incoming replies
- TYPE: QUESTION or STATUS: BLOCKED from an agent: if the answer is in your context (the user's request, earlier replies, AGENTS.md), answer with send_message TYPE: QUESTION. If only the user can decide (credentials, product choice, conflict with the user's request), ask through the question UI, then forward the answer. Never invent an answer.
- An executor BLOCKED because the PLAN contradicts the real code: send the blocker to the planner for a corrected PLAN, then to the executor again.
- STATUS: NEEDS_REWORK from the reviewer: follow REWORK.
- TYPE: QUESTION or STATUS: BLOCKED from the reviewer (missing PLAN/ACCEPTANCE, unclear scope): answer from your context with send_message TYPE: QUESTION, adding the missing PLAN or ACCEPTANCE criteria. If only the user can decide, ask through the question UI first.

## Parallel work
Independent PLAN steps (disjoint files, no shared types) may go to several executors in one turn: create the extra executors first, then send one message per agent. Review only after every RESULT is in, passing the reviewer all RESULTs.

A turn that calls create_agent ends right after the call; never send_message in the same turn. A turn that calls send_message ends right after the calls: wait for the replies and never predict them. Several send_message calls to different agents may share a turn.
${MESSAGE_FORMAT}`;
};