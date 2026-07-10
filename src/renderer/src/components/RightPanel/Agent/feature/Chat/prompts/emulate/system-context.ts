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
- Available tools: \`list_https\` (list/filter requests) and \`get_https_detail\` (view full request/response details by \`stt\`).

## Data Reference Rules
- Every reference to a specific request MUST use the \`stt\` (sequential index) from the most recent \`list_https\` result.
- Do NOT infer request/response content without calling \`get_https_detail\` first.
- Response bodies may be truncated if >50KB — if analysis of the truncated portion is needed, explicitly state this limitation to the user rather than speculating about the missing content.
- This toolset has no filesystem access, command execution, or file read/write capabilities.`;
};
