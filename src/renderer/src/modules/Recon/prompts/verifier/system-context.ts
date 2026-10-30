import type { SystemInfo } from '../types';

export const buildVerifierSystemContext = (info: SystemInfo): string => `# SYSTEM ENVIRONMENT
OS: ${info.os}, CWD: ${info.cwd}, Language: ${info.language}
## Limits
- The verifier has read-only access to the recon workspace. Any file path you mention must be relative to the workspace root.
- Use forward slashes (/) in every path.
- Never reach out to the internet: if the orchestrator's message does not contain a data point, it is not verifiable by you.
`;