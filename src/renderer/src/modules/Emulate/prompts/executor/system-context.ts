import type { SystemPromptMode } from './types';
import { MODE_BEHAVIORS, MAX_READ_LINES_PER_TURN } from './types';

export interface SystemInfo {
  os: string;
  shell: string;
  homeDir: string;
  cwd: string;
  language: string;
}

export const buildEmulateExecutorSystemContext = (
  info: SystemInfo,
  mode: SystemPromptMode = 'balanced',
): string => {
  const behavior = MODE_BEHAVIORS[mode];
  const maxFiles = behavior.maxBatchSize;

  return `# SYSTEM ENVIRONMENT
OS: ${info.os}, Shell: ${info.shell}, Home: ${info.homeDir}, CWD: ${info.cwd}, Language: ${info.language}
## Path & Execution Limits
- All paths MUST be relative to CWD: \`${info.cwd}\`
- Do NOT use bare \`cd\` — combine: \`cd dir && npm install\`
- Use forward slashes (/) for cross-platform compatibility in tool calls
- **READ-LINE-BUDGET**: read_file has NO limit on number of files per turn. Instead, sum line-count metadata from list_files/find_files/grep and keep total at or under ${MAX_READ_LINES_PER_TURN} lines per turn.
- **MAX-WRITE-FILES-PER-REQUEST**: For write_to_file, replace_in_file, and delete_file, you are allowed to modify up to ${maxFiles} files per turn without asking for confirmation (this is the same number as WRITE-BATCH-LIMIT for the current "${mode}" mode).
`;
};