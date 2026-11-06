import { createToolParser } from './TaskToolParserUtils';

export const parseListTasks = createToolParser('list_tasks', {
  required: [],
  optional: ['status'],
});