export type NodeStatus = 'done' | 'active' | 'todo' | 'blocked';
export type FileAction = 'create' | 'modify' | 'read' | 'delete';
export type TabId = 'overview' | 'files' | 'conclusion';

export interface CheckItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DiffLine {
  t: '+' | '-' | ' ';
  s: string;
}

export interface FileRef {
  path: string;
  action: FileAction;
  note: string;
  lines?: string;
  diff?: DiffLine[];
}

export interface NodeConclusion {
  summary: string;
  lessons: string[];
}

export interface WorkflowNode {
  id: string;
  title: string;
  summary: string;
  status: NodeStatus;
  dependsOn: string[];
  description: string;
  subtasks: CheckItem[];
  files: FileRef[];
  handoff: string;
  conclusion?: NodeConclusion;
}

export interface WorkflowPlan {
  taskId: string;
  taskTitle: string;
  goal: string;
  branch: string;
  nodes: WorkflowNode[];
}