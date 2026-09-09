export interface SystemInfo {
  os: string;
  ide: string;
  shell: string;
  homeDir: string;
  cwd: string;
  language: string;
}

export const buildSystemContext = (info: SystemInfo): string => {
  return `# SYSTEM ENVIRONMENT
OS: ${info.os}, IDE: ${info.ide}, Shell: ${info.shell}, Home: ${info.homeDir}, CWD: ${info.cwd}, Language: ${info.language}

## Browser Control Scope
- All actions are performed on live browser sessions with fingerprint protection (ungoogled-chromium).
- The complete toolset is defined in RECON TOOLS REFERENCE (23 tools, spec v2). Categories include: tab management (list_tabs, create_tab, close_tab, switch_tab), navigation (navigate, back, forward, reload), content extraction (get_page_content, list_elements, list_frames, capture_screenshot), interaction (click_element, fill_input, clear_input, select_option, hover, upload_file, press_key, scroll, scroll_to_element), synchronization (wait_for), and script execution (evaluate_js).

## Data Reference Rules
- Every reference to a specific tab MUST use the \`tabId\` from the most recent \`list_tabs\` result.
- Every reference to a page element MUST use selectors from \`get_page_content\` or \`list_elements\` results.
- Do NOT infer page content without calling \`get_page_content\` first.
- Do NOT interact with elements without verifying they exist via \`get_page_content\` or \`list_elements\` first.
- Page content may be truncated — if analysis of the truncated portion is needed, explicitly state this limitation to the user rather than speculating about the missing content. The exact truncation threshold is defined in the \`get_page_content\` tool reference.
- Browser control is limited to tabs and pages managed by the Recon module. This toolset has no command execution or general filesystem access. Two exceptions exist: \`upload_file\` reads a local file solely for attaching to a file input element on the page, and \`evaluate_js\` executes JavaScript within the current page context (which may access page-scoped data such as cookies, localStorage, or make fetch requests). All other tools operate strictly within the browser DOM scope.`;
};
