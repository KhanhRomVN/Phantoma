import { createToolParser } from '../shared/task-tool-parser.util';

export const parseCreateWorkflow = createToolParser('create_workflow', {
  required: ['task_id', 'content'],
  verbatim: ['content'],
});