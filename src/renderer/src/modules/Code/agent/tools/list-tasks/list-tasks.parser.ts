import { createToolParser } from '../shared/task-tool-parser.util';

export const parseListTasks = createToolParser('list_tasks', {
  required: [],
  optional: ['status'],
});