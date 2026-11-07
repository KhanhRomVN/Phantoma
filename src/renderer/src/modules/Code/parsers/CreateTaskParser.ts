import { createToolParser } from './TaskToolParserUtils';

export const parseCreateTask = createToolParser('create_task', {
  required: ['title'],
  optional: ['description', 'priority', 'due_date'],
  verbatim: ['description'],
});