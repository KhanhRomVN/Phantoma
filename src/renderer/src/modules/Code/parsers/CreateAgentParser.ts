export function parseCreateAgent(raw: string): any {
  // Try JSON format first
  try {
    const jsonMatch = raw.match(/```json\s*({[\s\S]*?})\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.tool === 'create_agent' && parsed.params) {
        const { agent_type, agent_name, provider_id, model_id, account_id } = parsed.params;

        if (!agent_type || !agent_name) {
          return {
            type: 'create_agent',
            params: { _validationError: 'Missing required fields: agent_type, agent_name' },
          };
        }

        if (!['executor', 'planner', 'reviewer'].includes(agent_type)) {
          return {
            type: 'create_agent',
            params: { _validationError: 'agent_type must be executor, planner, or reviewer' },
          };
        }

        const result = {
          type: 'create_agent',
          params: {
            agent_type,
            agent_name,
            provider_id: provider_id || '',
            model_id: model_id || '',
            account_id: account_id || '',
          },
        };
        return result;
      }
    }
  } catch (e) {
    // JSON parse failed, try XML
  }

  // Try XML format
  const xmlMatch = raw.match(
    /<create_agent\s+agent_type="([^"]+)"\s+agent_name="([^"]+)"\s+provider_id="([^"]+)"\s+model_id="([^"]+)"\s+account_id="([^"]+)"\s*\/>/,
  );

  if (!xmlMatch) {
    return {
      type: 'create_agent',
      params: { _validationError: 'Invalid create_agent syntax' },
    };
  }

  const [, agent_type, agent_name, provider_id, model_id, account_id] = xmlMatch;

  if (!['executor', 'planner', 'reviewer'].includes(agent_type)) {
    return {
      type: 'create_agent',
      params: { _validationError: 'agent_type must be executor, planner, or reviewer' },
    };
  }

  const result = {
    type: 'create_agent',
    params: {
      agent_type,
      agent_name,
      provider_id,
      model_id,
      account_id,
    },
  };
  return result;
}
