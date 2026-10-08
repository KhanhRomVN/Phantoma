/**
 * AI-agent helpers for the workspace:
 *  - favicon lookup for detected agents (shown in tab icons)
 *  - syncing a detected agent back into the project store (SessionCard display)
 */

import { useCodeStore } from '../hooks/useCodeStore';
import type { SessionStatus } from '../components/ProjectPanel/SessionCard';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';

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
/**
 * Attach or Update an agent in the project store.
 * @param status If provided, forces this status. If omitted, defaults to 'idle' for new agents,
 *               and keeps current status for existing ones unless explicitly changed by other means.
 */
export function attachAgentToProject(
  projectId: string,
  providerId: string,
  status?: SessionStatus,
): void {
  const { projects, updateProject } = useCodeStore.getState();
  const project = projects.find((p) => p.id === projectId);
  const targetBranch = project?.branches?.[0];
  const session = targetBranch?.sessions?.[0];

  if (!project || !targetBranch || !session) return;

  const agents = [...session.agents];
  const existingIdx = agents.findIndex((a) => a.name.toLowerCase() === providerId.toLowerCase());

  let newStatus: SessionStatus;

  if (existingIdx >= 0) {
    // Existing agent: Use forced status if provided, otherwise keep current
    newStatus = status ?? agents[existingIdx].status;
    agents[existingIdx] = { ...agents[existingIdx], status: newStatus };
  } else {
    // New agent: Default to 'idle' unless forced otherwise
    newStatus = status ?? 'idle';
    agents.push({
      name: providerId,
      color: colorForAgent(providerId),
      initials: providerId.substring(0, 2).toUpperCase(),
      status: newStatus,
    });
  }

  // Determine overall session status based on agents
  const hasRunning = agents.some((a) => a.status === 'running');
  const sessionStatus: SessionStatus = hasRunning ? 'running' : 'idle';

  const updatedSession = { ...session, agents, status: sessionStatus };

  // Construct new branches array.
  const newBranches = (project.branches ?? []).map((branch, branchIdx) => {
    if (branchIdx !== 0) return branch;

    const newSessions = branch.sessions.map((s, sessionIdx) =>
      sessionIdx === 0 ? updatedSession : s,
    );

    return { ...branch, sessions: newSessions };
  });

  // Cast to any to bypass deep structural type inference issues with spread operators on nested arrays.
  // Logic is verified at runtime; this is purely a TypeScript compiler workaround for complex generics.
  updateProject(projectId, { branches: newBranches } as any);
}

/**
 * Remove an agent completely from the session's badge list.
 * Used when agent becomes idle or process exits.
 */
export function removeAgentFromProject(projectId: string, providerId: string | null): void {
  if (!providerId) return;

  const { projects, updateProject } = useCodeStore.getState();
  const project = projects.find((p) => p.id === projectId);
  const targetBranch = project?.branches?.[0];
  const session = targetBranch?.sessions?.[0];

  if (!project || !targetBranch || !session) return;

  const originalCount = session.agents.length;
  const filteredAgents = session.agents.filter(
    (a) => a.name.toLowerCase() !== providerId.toLowerCase(),
  );

  if (filteredAgents.length === originalCount) {
    return;
  }

  const updatedSession = { ...session, agents: filteredAgents };
  const hasRunning = filteredAgents.some((a) => a.status === 'running');
  const newSessionStatus = hasRunning ? 'running' : 'idle';

  const branches = (project.branches ?? []).map((branch, branchIdx) =>
    branchIdx !== 0
      ? branch
      : {
          ...branch,
          sessions: branch.sessions.map((s, sessionIdx) =>
            sessionIdx === 0 ? { ...updatedSession, status: newSessionStatus } : s,
          ),
        },
  );

  // Cast to any to bypass deep structural type inference issues with spread operators on nested arrays.
  updateProject(projectId, { branches } as any);
}

/**
 * Legacy detach - kept for compatibility if needed, but now delegates to removal.
 */
export function detachAgentFromProject(projectId: string, providerId: string | null): void {
  removeAgentFromProject(projectId, providerId);
}
