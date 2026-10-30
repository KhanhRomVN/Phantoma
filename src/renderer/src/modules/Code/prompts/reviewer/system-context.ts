import type { SystemInfo } from "../code/system-context";
import { HANDOFF_AGENT, HANDOFF_TOOL } from "./tools-reference";

const buildReadOnlySystemContext = (info: SystemInfo, role: string): string => {
  const { os, shell, homeDir, cwd, language } = info;
  return [
    `# SYSTEM ENVIRONMENT`,
    `OS: ${os}, Shell: ${shell}, Home: ${homeDir}, CWD: ${cwd}, Language: ${language}`,
    `## Path & Execution Limits`,
    `- All paths MUST be relative to CWD: \`${cwd}\``,
    `- Do NOT use bare \`cd\` — combine: \`cd dir && npm test\``,
    `- Use forward slashes (/) for cross-platform compatibility in tool calls (read_file, list_files, etc.)`,
    `- The ${role} can only communicate with the orchestrator via ${HANDOFF_TOOL} with agent_id="${HANDOFF_AGENT}". It never talks to the user or other agents.`,
  ].join("\n");
};

export const buildReviewerSystemContext = (info: SystemInfo): string =>
  buildReadOnlySystemContext(info, "reviewer");