import { createToolParser } from './TaskToolParserUtils';

export const parseGetWorkflow = createToolParser('get_workflow', {
  required: ['task_id'],
});