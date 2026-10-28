import type { SystemInfo } from '../types';

export const buildPlannerSystemContext = (info: SystemInfo): string => `# SYSTEM ENVIRONMENT
OS: ${info.os}, Shell: ${info.shell}, CWD: ${info.cwd}, Language: ${info.language}
## Limits
- The planner has read-only access to the recon workspace. Any file path you mention must be relative to the workspace root.
- Use forward slashes (/) in every path you put in a message.
`;