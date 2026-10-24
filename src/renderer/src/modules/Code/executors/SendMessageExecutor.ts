import { useWorkflowStore } from '../hooks/useWorkflowStore';

export async function executeSendMessage(params: {
  agent_id?: string;
  message?: string;
  _validationError?: string;
}): Promise<string | null> {
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

  // Determine sender (orchestrator is the default sender for now)
  const from = 'orchestrator';
  
  // Format time (HH:MM)
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // Add message to store
  store.addMessage({
    from,
    to: agent_id,
    content: message,
    time,
  });

  return `[send_message to '${agent_id}'] Result: Message sent successfully (${message.length} characters)`;
}