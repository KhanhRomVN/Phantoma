type ToolFormat = 'xml' | 'json' | 'dsml';

const REMINDER_SUB_AGENTS = ['planner', 'executor', 'reviewer', 'tester'] as const;
type ReminderSubAgent = (typeof REMINDER_SUB_AGENTS)[number];

export const isReminderSubAgent = (agentId: string | null | undefined): boolean => {
  if (!agentId) return false;
  return REMINDER_SUB_AGENTS.includes(agentId as ReminderSubAgent);
};

export const buildSubAgentFormatReminder = (
  _agentId: string,
  toolFormat: ToolFormat,
): string => {
  const formatName = toolFormat === 'json' ? 'JSON' : 'XML';
  return `Your last response contained no tool calls. As a sub-agent, you MUST emit at least one tool call (e.g., send_message to report results) in every response. Respond now with the appropriate ${formatName} tool call.`;
};