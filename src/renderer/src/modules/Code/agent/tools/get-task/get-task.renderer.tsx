import React from 'react';
import type { BaseRendererProps } from '@renderer/components/Widgets/Zen/screens/Chat/types/renderer-types';
import TaskToolRendererBase from '../shared/task-tool-base.renderer';

const GetTaskRenderer: React.FC<BaseRendererProps> = (props) => <TaskToolRendererBase {...props} />;

export default GetTaskRenderer;
