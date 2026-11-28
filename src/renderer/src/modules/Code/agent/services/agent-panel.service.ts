/**
 * ------------------------------------------------------------------
 * Agent Panel Service
 * ------------------------------------------------------------------
 * Mở và focus panel của một agent trong workspace. Tự tạo agent mặc định
 * trong workflow store nếu chưa tồn tại, sau đó phát custom event để UI mở panel.
 *
 * Main functions:
 * - focusAgentPanel() : Focus panel của agent theo agentId
 *
 * Main constants:
 * - OPEN_AGENT_PANEL_EVENT : Tên custom event dùng để mở agent panel
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Stores ──
import { useCodeStore } from '../../shared/stores/code.store';
import { useWorkflowStore } from '../stores/workflow.store';

// ── Types ──
import { AGENT_TYPE_COLORS, type AgentType } from '../../shared/types/agents.types';

// ─── Constants ───────────────────────────────────────────────────────────────
export const OPEN_AGENT_PANEL_EVENT = 'phantoma:open-agent-panel';

// ─── Functions ───────────────────────────────────────────────────────────────
const humanizeAgentId = (id: string): string =>
  id
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

export function focusAgentPanel(agentId: string): void {
  if (!agentId) return;
  const codeStore = useCodeStore.getState();
  const sessionId = codeStore.activeWorkspaceSessionId;
  if (!sessionId) return;

  const workflow = useWorkflowStore.getState();
  let agent = workflow.getAgent(agentId);
  if (!agent) {
    const type: AgentType = 'executor';
    agent = {
      id: agentId,
      name: humanizeAgentId(agentId),
      title: 'Agent',
      type,
      color: AGENT_TYPE_COLORS[type],
    };
    workflow.addAgent(agent);
  }

  const title =
    agent.id === 'orchestrator' ? 'Zen' : `${capitalize(agent.type)} - ${agent.name}`;

  codeStore.setContentViewMode('workspace');
  window.dispatchEvent(
    new CustomEvent(OPEN_AGENT_PANEL_EVENT, {
      detail: { sessionId, agentId, title, focus: true, done: () => {} },
    }),
  );
}