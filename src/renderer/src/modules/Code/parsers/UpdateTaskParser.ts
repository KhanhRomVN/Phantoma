import { createToolParser } from './TaskToolParserUtils';

export const parseUpdateTask = createToolParser('update_task', {
  required: ['task_id'],
  optional: ['title', 'description', 'status', 'priority', 'due_date'],
  verbatim: ['description'],
});