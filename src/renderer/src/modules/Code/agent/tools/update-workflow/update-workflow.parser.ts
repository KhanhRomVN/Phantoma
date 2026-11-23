import { createToolParser } from '../shared/task-tool-parser.util';

export const parseUpdateWorkflow = createToolParser('update_workflow', {
  required: ['task_id', 'old_content', 'new_content'],
  verbatim: ['old_content', 'new_content'],
});