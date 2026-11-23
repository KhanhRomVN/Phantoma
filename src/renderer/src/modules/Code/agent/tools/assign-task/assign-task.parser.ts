import { createToolParser } from '../shared/task-tool-parser.util';

export const parseAssignTask = createToolParser('assign_task', {
  required: ['task_id'],
});