import { createToolParser } from '../shared/task-tool-parser.util';

export const parseCreateTask = createToolParser('create_task', {
  required: ['title'],
  optional: ['description', 'priority', 'due_date'],
  verbatim: ['description'],
});