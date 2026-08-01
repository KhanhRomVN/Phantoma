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

## Data Scope
- All analysis is performed on pre-captured HTTPS traffic data.
- Available tools: \`list_https\` (list/filter requests), \`get_https_detail\` (view request/response details), \`list_hosts\` (list unique hosts), \`list_sources\` (list source files as tree), \`get_source_detail\` (view source code).

## Data Reference Rules
- Every reference to a specific request MUST use the \`stt\` (sequential index) from the most recent \`list_https\` result.
- Every reference to a specific source file MUST use the \`stt\` (sequential index) from the most recent \`list_sources\` result.
- Do NOT infer request/response content without calling \`get_https_detail\` first.
- Do NOT infer source code content without calling \`get_source_detail\` first.
- Response bodies may be truncated if >50KB — if analysis of the truncated portion is needed, explicitly state this limitation to the user rather than speculating about the missing content.
- Source code viewing is limited to files captured in the traffic — this toolset has no filesystem access, command execution, or direct file read/write capabilities.`;
};