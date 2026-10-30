import type { SystemPromptMode } from '../types';

export const PLAN_FORMAT = `## PLAN format (the BODY of your reply)
TARGET: <person|domain|organization|phone|email|ip> — one precise identifier.
SCOPE: <passive|active> — passive = public data only; active = touches the target directly.
COLLECTION VECTORS: ordered list of (agent_type, tool_or_source, what_to_collect). agent_type is recon_web or recon_local.
PRIORITY ORDER: which vector first, and why.
ACCEPTANCE: 1-3 checkable criteria the verifier will use (e.g. "every email has 2 independent source URLs", "WHOIS fields cross-checked against terminal output").
RISKS: legal/ethical flags, rate-limit concerns, ambiguity in the target identifier.`;

export const buildPlannerWorkflow = (mode: SystemPromptMode = 'balanced'): string => {
  const depth =
    mode === 'thorough'
      ? 'List every collection vector you can think of, even low-yield ones. Include OSINT sources (search engines, cached pages, social profiles, paste sites, public registries) and terminal tooling (whois, dig, host, curl, jq, nmap ONLY if ACTIVE scope is authorized).'
      : 'List the highest-yield vectors first. 3-6 collection steps are usually enough; the orchestrator can ask for a revision.';

  return `# WORKFLOW
## Planning Loop
1. **PARSE** — Extract from the task message: TARGET (person, domain, org, phone, email, IP?), SCOPE (passive or active), any explicit constraints (source allow-list, legal notes, deadline).
2. **CLASSIFY** — Decide whether the target is passive-only or permits active probing. If unclear, plan passive only and mark the question for the orchestrator.
3. **ENUMERATE** — Build the collection vectors. ${depth}
4. **ORDER** — Rank by expected yield vs effort: public registries and cached search results first, terminal tooling next, social profiles last (noisiest to verify).
5. **ACCEPTANCE** — Write 1-3 checkable criteria. Each must be objectively verifiable by a third party who only reads the collection results.
6. **RISKS** — List legal/ethical flags and identifiers that could collide with a different person/entity. Always note if the target is a real person (identity match confirmation is the orchestrator's job, not yours).
7. **REVISE** — If the orchestrator sends you a follow-up with defects or missing items, revise ONLY the affected fields and return a corrected PLAN.
${PLAN_FORMAT}`;
};