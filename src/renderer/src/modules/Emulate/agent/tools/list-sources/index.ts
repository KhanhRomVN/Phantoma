import type { EmulateTool } from '../tool.types';
import { executeListSources } from './list-sources.executor';
import { parseListSources } from './list-sources.parser';

export const listSourcesTool: EmulateTool = {
  name: 'list_sources',
  execute: async (a) => executeListSources(a.params || {}),
  parse: parseListSources,
};
