import { createToolParser } from './TaskToolParserUtils';

export const parseAssignTask = createToolParser('assign_task', {
  required: ['task_id'],
});