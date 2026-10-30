import type { SystemPromptMode } from '../types';

export const RESULT_FORMAT = `## RESULT format (the BODY of your reply)
SOURCE URL: the page you actually collected from (one per fact if several).
FIELDS: a bullet list of extracted facts — one fact per line, followed by its exact source URL.
EVIDENCE: (optional) short verbatim quotes or screenshot refs that back a field.
OPEN ISSUES: fields the task asked for that you could not find, and why (login wall, 404, rate limit).`;

export const buildWebCollectorWorkflow = (mode: SystemPromptMode = 'balanced'): string => {
  const depth =
    mode === 'thorough'
      ? 'Capture a screenshot for every page whose fields you extract, and record exact element refs for every interactive element you touch.'
      : 'Capture a screenshot only when the visual layout carries information (maps, diagrams, dynamic content).';

  return `# WORKFLOW
## Collection Loop
1. **ORIENT** — Call list_tabs to see current tabs. If the task names a URL and no tab is on it, create_tab (or navigate an existing tab). Never assume a tab id.
2. **NAVIGATE** — navigate with waitUntil=networkidle for SPA content. Wait for load confirmation before extracting.
3. **EXTRACT** — get_page_content for markdown, list_elements for interactive elements. Read everything the task asked for. ${depth}
4. **INTERACT** — Only click / fill / scroll when the task requires it (e.g. paginate, expand a details panel, submit a public search form). Never submit a form that requires authentication or creates data on the target.
5. **EVALUATE-JS** — Only for read-only extraction the other tools cannot express (e.g. copy a DOM attribute that get_page_content drops). Never use it to change state. ASK the orchestrator (TYPE: QUESTION) before using evaluate_js.
6. **REPORT** — Send one RESULT in the exact RESULT format below, with source URLs on every field.
${RESULT_FORMAT}`;
};