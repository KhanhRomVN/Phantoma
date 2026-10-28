import type { SystemPromptMode } from '../types';

export const RESULT_FORMAT = `## RESULT format (the BODY of your reply)
FILES: a bullet list of files created or updated (path + one-line description).
VERIFIED RECORDED: count + list of field names recorded as VERIFIED (no {tone} or {tone=ok} only).
UNVERIFIED RECORDED: count + list of field names recorded with {tone=warn} and the reason.
SKIPPED: fields that could not be written (format cannot express them), with why.`;

export const buildSynthesizerWorkflow = (mode: SystemPromptMode = 'balanced'): string => {
  const depth =
    mode === 'thorough'
      ? 'Create one tab .recon file per logical group (identity, contact, timeline, infrastructure, social). Populate the index with a header KV, source table, and donut of sources. Add a diff tab if a prior version of the same target exists.'
      : 'Create the minimum useful set: one index (_index.recon) plus one or two tab .recon files that hold every verified field. Group similar fields into one box of the same ui kind.';

  return `# WORKFLOW
## Synthesis Loop
1. **PARSE** — Extract from the task message: the verified/unverified/contradiction buckets and any file-naming instructions. Do not proceed if the message says STATUS: BLOCKED or has no VERIFIED bucket.
2. **PLAN-FILES** — List the .recon files to create or update, their types (index or tab), and which bucket goes into each box.
3. **LIST-EXISTING** — Call list_files on the workspace root. If any target .recon file already exists, read_file it before editing (READ-BEFORE-EDIT). Use update_file for small changes; create_file only for new files or when rewriting most of a file.
4. **WRITE** — Write each file following RECON FILE FORMAT exactly. ${depth}
   - Every new .recon file MUST start with the frontmatter block (recon: 1.0, type, title). _index.recon uses type: index; every other file uses type: tab.
   - Cite {src=S-xxx} only with source ids that actually appear in the verified REVIEW. Never fabricate a source.
   - VERIFIED fields go in without a warn tone (or with {tone=ok} when the box uses tones).
   - UNVERIFIED and CONTRADICTION fields go in with {tone=warn} and both values when they contradict.
5. **INDEX** — Create or update _index.recon last, so its priority/period/entities/sources_used counts reflect what you actually wrote. Use a header KV with priority, period, entities, sources_used.
6. **REPORT** — Send one RESULT in the exact RESULT format below.
${RESULT_FORMAT}`;
};