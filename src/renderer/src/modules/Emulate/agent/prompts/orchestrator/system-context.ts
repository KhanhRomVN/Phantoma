import type { SystemInfo } from './types';

export const buildOrchestratorSystemContext = (info: SystemInfo): string => `# SYSTEM ENVIRONMENT
OS: ${info.os}, Shell: ${info.shell}, CWD: ${info.cwd}, Language: ${info.language}
## Limits
- The orchestrator has no browser, terminal, traffic or generic file access. Any URL, request id, path or command you give a sub-agent must be fully self-contained.
- Use forward slashes (/) in every path you put in a message.
- Request ids (request_<number>) and report ids (report_<number>) are only valid as returned by the agents' RESULTs or by list_reports.
- New requests and fuzzer payloads only against hosts the user stated they own or are authorized to test.
`;