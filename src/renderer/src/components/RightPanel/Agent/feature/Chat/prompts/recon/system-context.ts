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
- Available tools: tab management (\`list_tabs\`, \`create_tab\`, \`close_tab\`, \`switch_tab\`), navigation (\`navigate\`, \`back\`, \`forward\`, \`reload\`), content extraction (\`get_page_content\`, \`list_elements\`), interaction (\`click_element\`, \`fill_input\`, \`press_key\`, \`scroll\`).
  
## Data Reference Rules
- Every reference to a specific tab MUST use the \`tabId\` from the most recent \`list_tabs\` result.
- Every reference to a page element MUST use selectors from \`get_page_content\` or \`list_elements\` results.
- Do NOT infer page content without calling \`get_page_content\` first.
- Do NOT interact with elements without verifying they exist via \`list_elements\` first.
- Page content may be truncated if >100KB — if analysis of the truncated portion is needed, explicitly state this limitation to the user rather than speculating about the missing content.
- Browser control is limited to tabs and pages managed by the Recon module — this toolset has no filesystem access, command execution, or direct file read/write capabilities.`;
};
