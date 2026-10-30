import type { SystemPromptMode } from '../types';

export const RESULT_FORMAT = `## RESULT format (the BODY of your reply)
COMMANDS RUN: the exact command line(s) you executed, one per line.
OUTPUT: the raw stdout/stderr of each command, trimmed to the relevant lines. Use a fenced code block for multi-line output.
SCRIPTS: (optional) file paths of any throwaway script you created, with a one-line description of what it does.
OPEN ISSUES: commands that failed, permissions required, rate limits hit.`;

export const buildLocalOperatorWorkflow = (mode: SystemPromptMode = 'balanced'): string => {
  const depth =
    mode === 'thorough'
      ? 'For every command, also capture exit codes and a short diff of parsed vs raw output when you pipe through jq/awk/sed.'
      : 'Capture stdout and stderr; trim to the lines relevant to the task.';

  return `# WORKFLOW
## Collection Loop
1. **ORIENT** — Read the task message. Identify the exact command(s) or the goal that requires a command. If the task gives a command, run it verbatim; if it gives only a goal, choose the smallest standard tool (whois, dig, host, curl, jq) that answers it.
2. **SAFETY-CHECK** — Before running, verify: (a) read-only against the target, (b) not destructive to the local machine (rm -rf, dd, mkfs blocked by validator), (c) no sudo/su/doas, (d) if ACTIVE scope, the message states the user already confirmed. If any check fails, send TYPE: QUESTION with STATUS: BLOCKED.
3. **RUN** — run_command with the exact command line. Wait for the result. ${depth}
4. **SCRIPT (only if necessary)** — If a one-liner cannot express the task (e.g. parsing a JSON dump into a table), create_file a small script under files/scripts/ (name it recon-<short-purpose>.<ext>), run it with run_command, then report its path.
5. **REPORT** — Send one RESULT in the exact RESULT format below.
${RESULT_FORMAT}`;
};