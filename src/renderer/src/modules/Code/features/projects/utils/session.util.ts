import { getFaviconUrl } from '@renderer/utils/favicon';
import {
  SessionStatus,
  ProcessStatus,
  AgentVisualState,
  AgentInfo,
  ProcessInfo,
  SessionInfo,
  BranchInfo,
} from '../types/session.types';
import { AGENT_STATE_ORDER } from '../constants/session.constants';

export function getTempSessionName(
  sessionId: string,
  projectName: string,
  branchName: string,
): string {
  const ts = Number(sessionId.replace(/^n/, ''));
  const time =
    ts > 1e12
      ? new Date(ts).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : sessionId.slice(-4);
  return `${projectName} · ${branchName} · ${time}`;
}

// Helper to map common AI Agent names/IDs to their official domains for favicon fetching
export const AGENT_DOMAIN_MAP: Record<string, string> = {
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
  qoder: 'https://qoder.ai',
  grok: 'https://grok.x.ai',
  kimi: 'https://moonshot.cn',
  droid: 'https://droid.app',
  hermes: 'https://nousresearch.com',
  aug: 'https://augmentcode.com',
  trae: 'https://trae.ai',
  zcode: 'https://zcode.io',
  devin: 'https://devin.ai',
  kiro: 'https://kiro.dev',
};

export function getAgentFavicon(agentName: string): string | undefined {
  // Normalize name to lowercase and check against map keys
  const lowerName = agentName.toLowerCase();
  // Check exact match first
  if (AGENT_DOMAIN_MAP[lowerName]) {
    return getFaviconUrl(AGENT_DOMAIN_MAP[lowerName]);
  }
  // Check partial matches for variations like "Claude Code", "Gemini CLI" etc.
  for (const [key, domain] of Object.entries(AGENT_DOMAIN_MAP)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return getFaviconUrl(domain);
    }
  }
  return undefined;
}

// ─── Helpers ────────────────────────────────────────────────────────────

export function getNewestSession(branch: BranchInfo): SessionInfo | null {
  return branch.sessions.length > 0 ? branch.sessions[0] : null;
}

export function getBranchStatus(branch: BranchInfo): SessionStatus {
  return getNewestSession(branch)?.status ?? 'idle';
}

/** Map agent status + session status to the avatar ring state */
export function getAgentState(agent: AgentInfo, sessionStatus: SessionStatus): AgentVisualState {
  if (agent.status === 'blocked') return 'err';
  if (agent.status === 'running') return 'run';
  if (agent.status === 'queued') return 'que';
  return sessionStatus === 'review' ? 'wait' : 'done';
}

/** Errors first, then waiting, running, queued, done */
export function sortAgentsByState(agents: AgentInfo[], sessionStatus: SessionStatus): AgentInfo[] {
  return [...agents].sort(
    (a, b) =>
      AGENT_STATE_ORDER.indexOf(getAgentState(a, sessionStatus)) -
      AGENT_STATE_ORDER.indexOf(getAgentState(b, sessionStatus)),
  );
}

export function getWorstProcessStatus(procs: ProcessInfo[]): ProcessStatus | undefined {
  return (['crashed', 'busy', 'live'] as ProcessStatus[]).find((k) =>
    procs.some((p) => p.status === k),
  );
}
