import { useWorkflowStore } from '../hooks/useWorkflowStore';
import { useCodeStore } from '../hooks/useCodeStore';

export async function executeSendMessage(
  params: {
    agent_id?: string;
    message?: string;
    _validationError?: string;
  },
  ctx?: { workflowAgentId?: string | null },
): Promise<string | null> {
  if (params._validationError) {
    return `[send_message] Result: Error - ${params._validationError}`;
  }

  const { agent_id, message } = params;

  if (!agent_id || !message) {
    return `[send_message] Result: Error - Missing agent_id or message`;
  }

  // Add message to workflow store
  const store = useWorkflowStore.getState();

  // Check if target agent exists
  const targetAgent = store.getAgent(agent_id);
  if (!targetAgent) {
    return `[send_message] Result: Error - Agent '${agent_id}' does not exist. Create it first with create_agent.`;
  }

  const from = ctx?.workflowAgentId ?? 'orchestrator';

  if (agent_id === from) {
    return `[send_message] Result: Error - An agent cannot send a message to itself`;
  }

  const codeState = useCodeStore.getState();
  const targetTabOpen = codeState.projects
    .find((p) => p.id === codeState.currentProjectId)
    ?.workspacePanels?.some(
      (p) => p.workflowAgentId === agent_id && p.sessionId === codeState.activeWorkspaceSessionId,
    );
  if (!targetTabOpen) {
    return `[send_message] Result: Error - The Zen tab of agent '${agent_id}' is not open, so the message was not delivered. Ask the user to reopen it${agent_id === 'orchestrator' ? '' : ' or create the agent again with create_agent'}.`;
  }

  // Format time (HH:MM)
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  store.addMessage({
    from,
    to: agent_id,
    content: message,
    time,
  });
  store.enqueueInbox(agent_id, { from, content: message });

  return `[send_message to '${agent_id}'] Result: Message sent successfully (${message.length} characters)`;
}
