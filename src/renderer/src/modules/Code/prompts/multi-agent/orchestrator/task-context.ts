import { formatTaskRange, type StoredTask } from "../../../services/task.service";

// 50-task cap — upgrade path: orchestrator pages the rest through list_tasks
const MAX_LISTED_TASKS = 50;

const timeOf = (task: StoredTask): string =>
  formatTaskRange(task) ?? "no schedule";

const listLine = (task: StoredTask): string =>
  `- ${task.id} | ${task.title} | ${timeOf(task)} | ${task.priority}`;

const pickCurrentTask = (
  tasks: StoredTask[],
  sessionId: string | null,
  branchName: string | null,
): StoredTask | undefined => {
  if (!sessionId) return undefined;
  const linked = tasks.filter(
    (task) =>
      task.sessionId === sessionId || (!!branchName && task.branchName === branchName),
  );
  return linked.find((task) => task.status !== "done") ?? linked[0];
};

const currentTaskBlock = (task: StoredTask): string =>
  [
    `id: ${task.id}`,
    `title: ${task.title}`,
    `status: ${task.status}`,
    `priority: ${task.priority}`,
    `time: ${timeOf(task)}`,
    `branch: ${task.branchName ?? "none"}`,
    `workflow_id: ${task.workflowId ?? "none (create one with create_workflow)"}`,
    `depends_on: ${task.dependsOn.length > 0 ? task.dependsOn.join(", ") : "none"}`,
    `tags: ${task.tags.length > 0 ? task.tags.map((tag) => tag.label).join(", ") : "none"}`,
    `checklist: ${
      task.checklist.length > 0
        ? task.checklist
            .map((item) => `[${item.done ? "x" : " "}] ${item.text}`)
            .join("; ")
        : "none"
    }`,
    `attachments: ${
      task.attachments.length > 0
        ? task.attachments.map((a) => `${a.kind}:${a.path}`).join(", ")
        : "none"
    }`,
    `description: ${task.description || "(empty)"}`,
  ].join("\n");

export const buildOrchestratorTaskContext = (
  tasks: StoredTask[],
  sessionId: string | null,
  branchName: string | null = null,
): string => {
  const active = tasks.filter((task) => !task.archived);
  const list =
    active.length > 0
      ? active.slice(0, MAX_LISTED_TASKS).map(listLine).join("\n")
      : "(no tasks)";
  const more =
    active.length > MAX_LISTED_TASKS
      ? `\n(${active.length - MAX_LISTED_TASKS} more tasks not shown: call list_tasks)`
      : "";
  const current = pickCurrentTask(active, sessionId, branchName);

  return `\n\n# TASKS (snapshot taken when the conversation started; call list_tasks / get_task for fresh data)
## Project tasks (id | title | time | priority)
${list}${more}
## Current task (assigned to this session)
${current ? currentTaskBlock(current) : "none: no task is assigned to this session yet (see assign_task)"}`;
};