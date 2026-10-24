import { MAX_READ_LINES_PER_TURN } from "@renderer/modules/Code/prompts/code/mode-config";
import type { SystemInfo } from "@renderer/modules/Code/prompts/code/system-context";

export const buildPlannerSystemContext = (info: SystemInfo): string => `# SYSTEM ENVIRONMENT
OS: ${info.os}, Shell: ${info.shell}, Home: ${info.homeDir}, CWD: ${info.cwd}, Language: ${info.language}
## Path & Execution Limits
- All paths MUST be relative to CWD: ${info.cwd}
- Do NOT use bare cd — combine: cd dir && command
- Use forward slashes (/) for cross-platform compatibility in tool calls
- **READ-LINE-BUDGET**: sum the line counts returned by list_files/find_files/grep for every file you want to read and keep the total at or under ${MAX_READ_LINES_PER_TURN} lines per turn.
- **READ-ONLY**: the planner has no write access to the codebase. Never create, edit or delete project files.
`;