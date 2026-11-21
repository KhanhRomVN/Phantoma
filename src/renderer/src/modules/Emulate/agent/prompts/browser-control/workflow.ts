import type { SystemPromptMode } from './types';

export const RESULT_FORMAT = `## RESULT format (the BODY of your reply)
FLOW: ordered list of the steps you actually performed (action + target URL or element ref).
OBSERVED: what the page showed after each step (final URL, visible text, status messages, errors).
TRAFFIC HINTS: (optional) which step likely triggered which request (expected method + path), so the analyzer can match captured traffic to your steps.
OPEN ISSUES: steps that failed or were skipped, and why (login wall, 404, captcha, rate limit).`;

export const buildBrowserControlWorkflow = (mode: SystemPromptMode = 'balanced'): string => {
  const depth =
    mode === 'thorough'
      ? 'Capture a screenshot after every step that changes the page, and record exact element refs for every interactive element you touch.'
      : 'Capture a screenshot only when the visual state carries information that page text does not.';

  return `# WORKFLOW
## Browser Loop
1. **ORIENT** — Call list_tabs to see current tabs. If no browser is running, launch_browser first. If the task names a URL and no tab is on it, create_tab (or navigate an existing tab). Never assume a tab id.
2. **NAVIGATE** — navigate with waitUntil=networkidle for SPA content. Wait for load confirmation before the next step.
3. **OBSERVE** — get_page_content for markdown, list_elements for interactive elements. ${depth}
4. **INTERACT** — Reproduce the flow exactly as the task states, in the stated order: click, fill, select, press keys, scroll. Each interaction generates traffic that Emulate captures, so do not add extra steps and do not repeat steps unless the task asks.
5. **EVALUATE-JS** — Only for read-only inspection the other tools cannot express. ASK the orchestrator (TYPE: QUESTION) before using evaluate_js.
6. **REPORT** — Send one RESULT in the exact RESULT format below.
${RESULT_FORMAT}`;
};