import React from 'react';
import type { BaseRendererProps } from '@renderer/components/Widgets/Zen/feature/Chat/types/renderer-types';
import TaskToolRendererBase from './TaskToolRendererBase';

const CreateWorkflowRenderer: React.FC<BaseRendererProps> = (props) => (
  <TaskToolRendererBase {...props} />
);

export default CreateWorkflowRenderer;
