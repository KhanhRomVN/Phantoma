import type { SystemInfo } from './types';

export const buildBrowserControlSystemContext = (info: SystemInfo): string => `# SYSTEM ENVIRONMENT
OS: ${info.os}, Shell: ${info.shell}, CWD: ${info.cwd}, Language: ${info.language}
## Limits
- You drive a real browser. Each tab is a live state; never assume one is open: call list_tabs first.
- All traffic you generate is captured by Emulate. Do not repeat a flow more than the task asks, so the capture stays clean.
- Use forward slashes (/) in every path you upload.
- Only perform actions the task states. Never authenticate with credentials the task did not provide and never create or delete data on the target unless the task explicitly authorizes it.
`;