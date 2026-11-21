import type { SystemPromptMode } from './types';

export const PLAN_FORMAT = `## PLAN format (the BODY of your reply)
TARGET: <host|API|flow> — one precise identifier (e.g. shop.example.com /login flow).
SCOPE: <passive|active> — passive = analyze already captured traffic, sources and logs only; active = sends new requests, fuzzer runs or fuzzer payloads to the target.
STEPS: ordered list of (agent_type, tool_or_source, what_to_do). agent_type is emulate_browser, emulate_cli or emulate_analyzer.
PRIORITY ORDER: which step first, and why.
ACCEPTANCE: 1-3 checkable criteria the orchestrator will use (e.g. "every finding cites a request id and an excerpt", "login flow reproduced in the order given").
RISKS: legal/ethical flags, authorization state, noisy-capture concerns, ambiguity in the target.`;

export const buildPlannerWorkflow = (mode: SystemPromptMode = 'balanced'): string => {
  const depth =
    mode === 'thorough'
      ? 'List every viable step, even low-yield ones: flow reproduction, header/cookie/token review, resource and source review, log review, fuzzer replays, fuzzer payload classes (ACTIVE only when authorized), and terminal tooling (curl, jq, openssl, mitmdump).'
      : 'List the highest-yield steps first. 3-6 steps are usually enough; the orchestrator can ask for a revision.';

  return `# WORKFLOW
## Planning Loop
1. **PARSE** — Extract from the task message: TARGET (host, API, flow), SCOPE (passive or active), explicit constraints (allowed hosts, authorization notes, deadline).
2. **CLASSIFY** — Decide whether the plan is passive-only or may send new requests. If authorization is unclear, plan passive only and flag the question for the orchestrator.
3. **ENUMERATE** — Build the steps. ${depth}
4. **ORDER** — Rank by yield vs effort: reproduce the flow in the browser first when traffic is missing, passive analysis next, terminal checks after, fuzzer/fuzzer last (noisiest).
5. **ACCEPTANCE** — Write 1-3 checkable criteria, verifiable by someone who only reads the RESULT messages.
6. **RISKS** — List legal/ethical flags and anything that could leak or alter data on the target.
7. **REVISE** — If the orchestrator sends defects or missing items, revise ONLY the affected fields and return a corrected PLAN.
${PLAN_FORMAT}`;
};