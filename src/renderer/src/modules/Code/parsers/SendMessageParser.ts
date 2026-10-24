export function parseSendMessage(raw: string): any {
  // Try JSON format first
  try {
    const jsonMatch = raw.match(/```json\s*({[\s\S]*?})\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.tool === 'send_message' && parsed.params) {
        const { agent_id, message } = parsed.params;
        
        if (!agent_id || !message) {
          return {
            type: 'send_message',
            params: { _validationError: 'Missing required fields: agent_id, message' },
          };
        }
        
        return {
          type: 'send_message',
          params: { agent_id, message },
        };
      }
    }
  } catch (e) {
    // JSON parse failed, try XML
  }

  // Try XML format
  const agentIdMatch = raw.match(/agent_id="([^"]+)"/);
  const messageMatch = raw.match(/<send_message[^>]*>([\s\S]*?)<\/send_message>/);

  if (!agentIdMatch || !messageMatch) {
    return {
      type: 'send_message',
      params: { _validationError: 'Invalid send_message syntax' },
    };
  }

  const agent_id = agentIdMatch[1];
  const message = messageMatch[1].trim();

  return {
    type: 'send_message',
    params: {
      agent_id,
      message,
    },
  };
}