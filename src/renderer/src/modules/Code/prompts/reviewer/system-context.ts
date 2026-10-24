import type { SystemInfo } from "@renderer/modules/Code/prompts/code/system-context";

const buildReadOnlySystemContext = (info: SystemInfo, role: string): string => {
  const { os, shell, homeDir, cwd, language } = info;
  return [
    `# SYSTEM ENVIRONMENT`,
    `OS: ${os}, Shell: ${shell}, Home: ${homeDir}, CWD: ${cwd}, Language: ${language}`,
    `## Path & Execution Limits`,
    `- All paths MUST be relative to CWD: \`${cwd}\``,
    `- Do NOT use bare \`cd\` — combine: \`cd dir && npm install\``,
    `- Use forward slashes (/) for cross-platform compatibility in tool calls (read_file, list_files, etc.)`,
    `- **READ-LINE-BUDGET**: read_file has NO limit on the number of files per turn. Instead, sum the line-count metadata already returned by list_files/find_files/grep for every candidate file and keep the total at or under 1500 lines per turn — an exact count, not an estimate.`,
    `- The ${role} can only communicate with the orchestrator via send_message with agent_id="orchestrator". It never talks to the user or other agents.`,
  ].join("\n");
};

export const buildReviewerSystemContext = (info: SystemInfo): string =>
  buildReadOnlySystemContext(info, "reviewer");