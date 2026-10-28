import type { SystemPromptMode } from '../types';

export const REVIEW_FORMAT = `## REVIEW format (the BODY of your reply)
VERIFIED: a bullet list of data points that met the acceptance criteria (≥2 independent source URLs agreeing). Each line: field = value — sources [S-001, S-002].
UNVERIFIED: a bullet list of data points that only had one source, no source URL, or an unparseable source. Each line: field = value — why unverified (single source, no URL, ...).
CONTRADICTIONS: a bullet list of data points where two sources disagree. Each line: field = valueA vs valueB — sourceA vs sourceB.
NOTES: (optional) scope or acceptance issues, missing criteria, follow-up suggestions.`;

export const buildVerifierWorkflow = (mode: SystemPromptMode = 'balanced'): string => {
  const strictness =
    mode === 'thorough'
      ? 'Require at least three independent sources for identity-critical fields (full name, birth date, address, email). Require an explicit source URL on every VERIFIED line.'
      : 'Require at least two independent sources for VERIFIED, and an explicit source URL on every line.';

  return `# WORKFLOW
## Verification Loop
1. **PARSE** — Split the incoming message into (a) the ACCEPTANCE criteria and (b) the collection result blocks, keeping each block's SOURCE URL fields intact.
2. **INDEX** — Assign each unique source URL a temporary id (S-001, S-002, ...) so the review can cite them compactly. Keep a scratch mapping in your reasoning; do NOT put it in the reply unless asked.
3. **CHECK** — For each data point, compare every source URL that mentions the same field. ${strictness} Count independent sources (same URL = one source, even if linked multiple times).
4. **CLASSIFY** — Put each data point into exactly one bucket: VERIFIED (met criteria), UNVERIFIED (single source, no URL, or unparseable), CONTRADICTIONS (two sources disagree).
5. **CROSS-FILE** — If the orchestrator names existing .recon files, read_file them and check whether the new findings agree with what is already recorded. Put mismatches under CONTRADICTIONS.
6. **BLOCKED** — If the message has no acceptance criteria, or a claimed field has no source URL at all, send TYPE: QUESTION with STATUS: BLOCKED, naming exactly what is missing.
7. **REPORT** — Send one REVIEW in the exact REVIEW format below.
${REVIEW_FORMAT}`;
};