/**
 * AI-agent helpers for the workspace:
 *  - favicon lookup for detected agents (shown in tab icons)
 *  - syncing a detected agent back into the project store (SessionCard display)
 */

import { useCodeStore } from '../hooks/useCodeStore';
import { getFaviconUrl } from '@renderer/utils/favicon';

// Map AI agent IDs to their official domains for favicon fetching
const AGENT_DOMAIN_MAP: Record<string, string> = {
  claude: 'https://claude.ai',
  codex: 'https://openai.com',
  gemini: 'https://gemini.google.com',
  copilot: 'https://github.com/features/copilot',
  cursor: 'https://cursor.sh',
  aider: 'https://aider.chat',
  goose: 'https://goose.block.co',
  amp: 'https://sourcegraph.com/amp',
  opencode: 'https://opencode.ai',
  cline: 'https://cline.bot',
  continue: 'https://continue.dev',
  antigravity: 'https://antigravity.dev', // Placeholder if unknown
  qoder: 'https://qoder.ai',
  grok: 'https://grok.x.ai',
  muse: 'https://muse.dev',
  kimi: 'https://moonshot.cn',
  droid: 'https://droid.app',
  hermes: 'https://nousresearch.com',
  aug: 'https://augmentcode.com',
  trae: 'https://trae.ai',
  zcode: 'https://zcode.io',
  devin: 'https://devin.ai',
  kiro: 'https://kiro.dev',
  kilo: 'https://kilo.codes',
  pi: 'https://pi.dev',
  omp: 'https://omp.sh',
  rovo: 'https://rovo.dev',
  codebuff: 'https://codebuff.dev',
  codebuddy: 'https://tencent.com',
  openclaude: 'https://openclaude.dev',
  mimo: 'https://xiaomimimo.com',
  ante: 'https://ante.dev',
  command: 'https://command.code',
  autohand: 'https://autohand.dev',
  freebuff: 'https://freebuff.dev',
  crush: 'https://crush.dev',
  openclaw: 'https://openclaw.dev',
  prime: 'https://prime.agent',
};

export function getAgentFavicon(agentId: string | null | undefined): string | undefined {
  if (!agentId) return undefined;
  const domain = AGENT_DOMAIN_MAP[agentId];
  return domain ? getFaviconUrl(domain) : undefined;
}

const AGENT_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

/** Deterministic colour per agent name (same agent → same colour every time). */
function colorForAgent(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AGENT_COLORS[hash % AGENT_COLORS.length];
}

/**
 * Attach a detected agent to the NEWEST session of the FIRST branch.
 * Heuristic: ideally terminal → session would be mapped explicitly.
 */
export function attachAgentToProject(projectId: string, providerId: string): void {
  const { projects, updateProject } = useCodeStore.getState();
  const project = projects.find((p) => p.id === projectId);
  const targetBranch = project?.branches?.[0];
  const session = targetBranch?.sessions?.[0];
  if (!project || !targetBranch || !session) return;

  const agents = [...session.agents];
  const existingIdx = agents.findIndex((a) => a.name.toLowerCase() === providerId.toLowerCase());

  if (existingIdx >= 0) {
    // Detection implies the agent is running
    agents[existingIdx] = { ...agents[existingIdx], status: 'running' };
  } else {
    agents.push({
      name: providerId,
      color: colorForAgent(providerId),
      initials: providerId.substring(0, 2).toUpperCase(),
      status: 'running',
    });
  }

  const updatedSession = { ...session, agents, status: 'running' as const };
  const branches = project.branches.map((branch, branchIdx) =>
    branchIdx !== 0
      ? branch
      : {
          ...branch,
          sessions: branch.sessions.map((s, sessionIdx) => (sessionIdx === 0 ? updatedSession : s)),
        },
  );

  updateProject(projectId, { branches });
}
