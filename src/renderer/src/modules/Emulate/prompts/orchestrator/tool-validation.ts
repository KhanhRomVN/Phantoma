import type { ToolFormat } from './types';

export const buildEmulateOrchestratorToolValidation = (toolFormat: ToolFormat): string => {
  if (toolFormat === 'json') {
    return `# TOOL VALIDATION (JSON FORMAT)
Every tool call is a single JSON object in its own json fence.
Valid shapes:
- Tool call: {"tool":"<name>","params":{...}}
- UI object: {"type":"markdown","content":"..."} or {"type":"question","questions":[...]}

Common mistakes:
- Inventing tool names (use only: list_agents, create_agent, delete_agent, send_message)
- Unescaped newlines/quotes in JSON strings
- Multiple objects in one block
- XML tags anywhere`;
  }
  return `# TOOL VALIDATION (XML FORMAT)
Every tool call is an XML tag.
Valid tools: list_agents, create_agent, delete_agent, send_message, conversation_title
UI tags: <markdown>...</markdown>, <question>...</question>

Common mistakes:
- Wrapping XML in json fences
- Inventing tool names
- HTML entities in content (<, >, &)`;
};