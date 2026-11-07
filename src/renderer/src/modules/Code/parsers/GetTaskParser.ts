import { createToolParser } from './TaskToolParserUtils';

export const parseGetTask = createToolParser('get_task', {
  required: ['task_id'],
});