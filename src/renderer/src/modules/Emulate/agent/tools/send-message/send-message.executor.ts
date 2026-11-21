import { ORCHESTRATOR_ID, useEmulateWorkflowStore } from '../../stores/emulate-workflow.store';

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

  const store = useEmulateWorkflowStore.getState();
  if (!store.getAgent(agent_id)) {
    return agent_id === ORCHESTRATOR_ID
      ? `[send_message] Result: Error - The orchestrator Zen tab is not open, so the message was not delivered.`
      : `[send_message] Result: Error - Agent '${agent_id}' does not exist. Create it first with create_agent.`;
  }

  const from = ctx?.workflowAgentId ?? ORCHESTRATOR_ID;
  if (agent_id === from) {
    return `[send_message] Result: Error - An agent cannot send a message to itself`;
  }

  store.enqueueInbox(agent_id, { from, content: message });

  return `[send_message to '${agent_id}'] Result: Message sent successfully (${message.length} characters)`;
}