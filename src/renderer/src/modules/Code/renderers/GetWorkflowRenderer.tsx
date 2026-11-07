import React from 'react';
import type { BaseRendererProps } from '@renderer/components/RightPanel/Zen/feature/Chat/types/renderer-types';
import TaskToolRendererBase from './TaskToolRendererBase';

const GetWorkflowRenderer: React.FC<BaseRendererProps> = (props) => (
  <TaskToolRendererBase {...props} />
);

export default GetWorkflowRenderer;