import type { SystemInfo } from '../types';

export const buildOrchestratorSystemContext = (info: SystemInfo): string => `# SYSTEM ENVIRONMENT
OS: ${info.os}, Shell: ${info.shell}, CWD: ${info.cwd}, Language: ${info.language}
## Limits
- The orchestrator has no browser, terminal or file access. Any URL, path or command you give a sub-agent must be fully self-contained.
- Use forward slashes (/) in every path you put in a message.
- Public OSINT only: never delegate access to private APIs, paid databases or login-gated pages without explicit user confirmation.
`;