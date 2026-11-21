import type { EmulateTool } from '../tool.types';
import { executeListAgents } from './list-agents.executor';
import { parseListAgents } from './list-agents.parser';

export const listAgentsTool: EmulateTool = {
  name: 'list_agents',
  execute: async () => executeListAgents(),
  parse: parseListAgents,
};
