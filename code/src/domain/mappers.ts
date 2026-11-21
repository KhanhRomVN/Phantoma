export type Row = Record<string, any>;

export function mapProject(r: Row) {
  return {
    id: r.id as string,
    logo: (r.logo ?? null) as string | null,
    name: r.name as string,
    repositoryUrl: (r.repository_url ?? null) as string | null,
    groupId: (r.group_id ?? null) as string | null,
    sortOrder: r.sort_order as number,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export function mapGroup(r: Row) {
  return {
    id: r.id as string,
    name: r.name as string,
    iconId: (r.icon_id ?? null) as string | null,
    sortOrder: r.sort_order as number,
    isOpen: r.is_open === 1,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export function mapWorktree(r: Row) {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    path: r.path as string,
    branch: r.branch as string,
    visible: r.visible === 1,
    searchTerm: r.search_term as string,
  };
}

export function mapScope(r: Row) {
  return {
    id: r.id as string,
    worktreeId: r.worktree_id as string,
    path: r.path as string,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export function mapSession(r: Row) {
  let layout: unknown = null;
  try {
    layout = r.layout ? JSON.parse(r.layout as string) : null;
  } catch {
    layout = null;
  }
  return {
    id: r.id as string,
    worktreeId: r.worktree_id as string,
    title: r.title as string,
    layout,
    activePanelId: (r.active_panel_id ?? null) as string | null,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export function mapWorkspacePanel(r: Row) {
  return {
    id: r.id as string,
    sessionId: r.session_id as string,
    type: r.type as string,
    title: r.title as string,
    content: (r.content ?? null) as string | null,
    filePath: (r.file_path ?? null) as string | null,
    cwd: (r.cwd ?? null) as string | null,
    providerId: (r.provider_id ?? null) as string | null,
    zencliConversationId: (r.zencli_conversation_id ?? null) as string | null,
    zencliLastActiveAt: (r.zencli_last_active_at ?? null) as number | null,
    agentConversationId: (r.agent_conversation_id ?? null) as string | null,
    agentTitle: (r.agent_title ?? null) as string | null,
    workflowAgentId: (r.workflow_agent_id ?? null) as string | null,
    pinned: r.pinned === 1,
    sortOrder: r.sort_order as number,
  };
}

export type Session = ReturnType<typeof mapSession>;

export function mapTask(r: Row) {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    title: r.title as string,
    description: r.description as string,
    status: r.status as 'todo' | 'progress' | 'done',
    priority: r.priority as 'low' | 'medium' | 'high',
    sessionId: (r.session_id ?? null) as string | null,
    branchName: (r.branch_name ?? null) as string | null,
    startDate: (r.start_date ?? null) as number | null,
    startTime: (r.start_time ?? null) as string | null,
    endDate: (r.end_date ?? null) as number | null,
    endTime: (r.end_time ?? null) as string | null,
    archived: r.archived === 1,
    workflowId: (r.workflow_id ?? null) as string | null,
    sortOrder: r.sort_order as number,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number,
  };
}

export function mapTaskTag(r: Row) {
  return {
    id: r.id as string,
    taskId: r.task_id as string,
    label: r.label as string,
    color: r.color as string,
  };
}

export function mapTaskChecklistItem(r: Row) {
  return {
    id: r.id as string,
    taskId: r.task_id as string,
    text: r.text as string,
    done: r.done === 1,
    sortOrder: r.sort_order as number,
  };
}

export function mapTaskAttachment(r: Row) {
  return {
    id: r.id as string,
    taskId: r.task_id as string,
    path: r.path as string,
    kind: r.kind as 'file' | 'folder',
    sortOrder: r.sort_order as number,
  };
}

export function mapWorkflow(r: Row) {
  return {
    id: r.id as string,
    taskId: r.task_id as string,
    content: r.content as string,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export type Project = ReturnType<typeof mapProject>;
export type Group = ReturnType<typeof mapGroup>;
export type Worktree = ReturnType<typeof mapWorktree>;
export type Scope = ReturnType<typeof mapScope>;
export type Task = ReturnType<typeof mapTask>;
export type TaskTag = ReturnType<typeof mapTaskTag>;
export type TaskChecklistItem = ReturnType<typeof mapTaskChecklistItem>;
export type TaskAttachment = ReturnType<typeof mapTaskAttachment>;
export type Workflow = ReturnType<typeof mapWorkflow>;

export type WorkspacePanelRecord = ReturnType<typeof mapWorkspacePanel>;
export type SessionWithWorkspace = Session & { panels: WorkspacePanelRecord[] };
export type WorktreeWithSession = Worktree & { session: SessionWithWorkspace | null };
export type ProjectWithWorktrees = Project & { worktrees: WorktreeWithSession[] };
export type WorktreeWithScopes = Worktree & { scopes: Scope[] };
export type TaskWithDetails = Task & {
  tags: TaskTag[];
  checklist: TaskChecklistItem[];
  attachments: TaskAttachment[];
  dependsOn: string[];
};