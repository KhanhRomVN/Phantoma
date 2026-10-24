import type { SystemInfo } from "@renderer/modules/Code/prompts/code/system-context";

export const buildOrchestratorSystemContext = (info: SystemInfo): string => `# SYSTEM ENVIRONMENT
OS: ${info.os}, Shell: ${info.shell}, Home: ${info.homeDir}, CWD: ${info.cwd}, Language: ${info.language}
## Limits
- The orchestrator has no file, command or memory access. Any path you mention to a sub-agent must be relative to CWD: ${info.cwd}
- Use forward slashes (/) in every path you put in a message.
`;