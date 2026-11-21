import type { EmulateTool } from '../tool.types';
import { executeCreateAgent } from './create-agent.executor';
import { parseCreateAgent } from './create-agent.parser';

export const createAgentTool: EmulateTool = {
  name: 'create_agent',
  execute: async (a) => executeCreateAgent(a.params || {}),
  parse: parseCreateAgent,
};
