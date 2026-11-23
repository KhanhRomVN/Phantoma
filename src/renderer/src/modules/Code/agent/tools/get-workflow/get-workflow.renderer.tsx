import React from 'react';
import type { BaseRendererProps } from '@renderer/components/Widgets/Zen/feature/Chat/types/renderer-types';
import TaskToolRendererBase from '../shared/task-tool-base.renderer';

const GetWorkflowRenderer: React.FC<BaseRendererProps> = (props) => (
  <TaskToolRendererBase {...props} />
);

export default GetWorkflowRenderer;
