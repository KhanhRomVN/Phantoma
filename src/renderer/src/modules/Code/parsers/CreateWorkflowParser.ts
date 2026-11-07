import { createToolParser } from './TaskToolParserUtils';

export const parseCreateWorkflow = createToolParser('create_workflow', {
  required: ['task_id', 'content'],
  verbatim: ['content'],
});