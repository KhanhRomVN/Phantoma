export const RESULT_FORMAT = `## RESULT format (body of send_message when reporting back)
STATUS: <OK|BLOCKED|NEEDS_REWORK>
SUMMARY: one sentence of what was done/found.
FILES_CHANGED: list of paths modified.
OUTPUT: completed filter config, fuzzer payloads, or analysis results.
BLOCKED_ON: what prevents progress (if STATUS: BLOCKED).
QUESTION: your question to orchestrator (if STATUS: BLOCKED).`;

export const buildEmulateExecutorWorkflow = (
  mode: 'fast' | 'balanced' | 'thorough' = 'balanced',
): string => {
  return `# WORKFLOW
1. ORIENT: Parse task message (goal, context, input, expected output).
2. EXPLORE: List/search relevant traffic data, filters, fuzzer configs.
3. READ: Load necessary files/configs before modifying.
4. EXECUTE: Apply changes (update filters, generate payloads, run analysis).
5. VERIFY: Check results match expected output.
6. REPORT: Send message to orchestrator with ${RESULT_FORMAT}

Mode: "${mode}" — determines assumption handling and verification depth.`;
};