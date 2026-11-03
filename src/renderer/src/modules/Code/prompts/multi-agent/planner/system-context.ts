import type { SystemInfo } from "./types";

export const buildPlannerSystemContext = (info: SystemInfo): string => `# SYSTEM ENVIRONMENT
OS: ${info.os}, Shell: ${info.shell}, Home: ${info.homeDir}, CWD: ${info.cwd}, Language: ${info.language}
## Path & Execution Limits
- All paths MUST be relative to CWD: ${info.cwd}
- Do NOT use bare cd — combine: cd dir && command
- Use forward slashes (/) for cross-platform compatibility in tool calls
`;