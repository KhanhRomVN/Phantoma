import { createToolParser } from '../shared/task-tool-parser.util';

export const parseGetWorkflow = createToolParser('get_workflow', {
  required: ['task_id'],
});