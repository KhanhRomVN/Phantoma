import type { EmulateTool } from '../tool.types';
import { executeListHosts } from './list-hosts.executor';
import { parseListHosts } from './list-hosts.parser';

export const listHostsTool: EmulateTool = {
  name: 'list_hosts',
  execute: async () => executeListHosts(),
  parse: parseListHosts,
};
