import { createToolParser } from '../shared/task-tool-parser.util';

export const parseGetTask = createToolParser('get_task', {
  required: ['task_id'],
});