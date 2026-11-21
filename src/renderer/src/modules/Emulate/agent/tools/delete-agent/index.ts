import type { EmulateTool } from '../tool.types';
import { executeDeleteAgent } from './delete-agent.executor';
import { parseDeleteAgent } from './delete-agent.parser';

export const deleteAgentTool: EmulateTool = {
  name: 'delete_agent',
  execute: async (a) => executeDeleteAgent(a.params || {}),
  parse: parseDeleteAgent,
};
