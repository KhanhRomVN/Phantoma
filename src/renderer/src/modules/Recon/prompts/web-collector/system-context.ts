import type { SystemInfo } from '../types';

export const buildWebCollectorSystemContext = (info: SystemInfo): string => `# SYSTEM ENVIRONMENT
OS: ${info.os}, Shell: ${info.shell}, CWD: ${info.cwd}, Language: ${info.language}
## Limits
- You drive a real browser. Each tab is a live state; never assume one is open — call list_tabs first.
- Use forward slashes (/) in every path you upload.
- Public, read-only browsing only. Never authenticate or create data on the target.
`;