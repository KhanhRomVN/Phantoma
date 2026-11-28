export const MAX_REWORK_ROUNDS = 3;

export const MESSAGE_FORMAT = `## Message format
TYPE: <TASK|PLAN|REWORK|QUESTION>
GOAL: one precise sentence.
CONTEXT: relevant traffic filters, fuzzer state, target info.
INPUT: the PLAN, RESULT or DEFECTS (copy in full), or "none".
EXPECTED OUTPUT: what the agent must reply with.
TYPE meaning: TASK = new work; PLAN = approved plan; REWORK = defects to fix; QUESTION = your answer.`;

export const buildEmulateOrchestratorWorkflow = (
  _mode: 'fast' | 'balanced' | 'thorough' = 'balanced',
): string => {
  return `# WORKFLOW
1. UNDERSTAND: Parse user request (filter traffic, run fuzzer, analyze results).
2. DELEGATE: Send task to appropriate agent (filter-agent for traffic analysis, fuzzer-agent for payload generation).
3. TRACK: Wait for agent replies, handle BLOCKED/NEEDS_REWORK.
4. REPORT: Summarize results to user.

Message format: ${MESSAGE_FORMAT}

Max rework rounds: ${MAX_REWORK_ROUNDS}.`;
};