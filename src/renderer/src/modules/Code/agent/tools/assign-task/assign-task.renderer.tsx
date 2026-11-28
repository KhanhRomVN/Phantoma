// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import React from 'react';

// ── Utils ──
import { BaseRendererProps } from '@renderer/modules/Code/shared/zen/zen-bridge';
import TaskToolRendererBase from '../shared/task-tool-base.renderer';

// ─── Component ───────────────────────────────────────────────────────────────
const AssignTaskRenderer: React.FC<BaseRendererProps> = (props) => (
  <TaskToolRendererBase {...props} />
);

export default AssignTaskRenderer;
