import type { ToolFormat } from "./types";

export type OrchestratorToolName =
  | "conversation_title"
  | "list_agents"
  | "create_agent"
  | "delete_agent"
  | "send_message"
  | "list_tasks"
  | "get_task"
  | "create_task"
  | "update_task"
  | "assign_task"
  | "create_workflow"
  | "get_workflow"
  | "update_workflow";
export type ToolParams = Record<string, string | number>;

export const ORCHESTRATOR_TOOLS: OrchestratorToolName[] = [
  "conversation_title",
  "list_agents",
  "create_agent",
  "delete_agent",
  "send_message",
  "list_tasks",
  "get_task",
  "create_task",
  "update_task",
  "assign_task",
  "create_workflow",
  "get_workflow",
  "update_workflow",
];

export const SUB_AGENT_IDS = ["planner", "executor", "reviewer"] as const;

export const tick = (text: string): string => "`" + text + "`";

export const callText = (
  name: OrchestratorToolName,
  params: ToolParams,
  format: ToolFormat,
): string => {
  if (format === "json") {
    return JSON.stringify({ tool: name, params });
  }
  if (Object.keys(params).length === 0) {
    return `<${name} />`;
  }
  if (name === "conversation_title") {
    return `<conversation_title>${params.title}</conversation_title>`;
  }
  const inner = Object.entries(params)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join("");
  return `<${name}>${inner}</${name}>`;
};

export const fenceCall = (
  name: OrchestratorToolName,
  params: ToolParams,
  format: ToolFormat,
): string => "```" + format + "\n" + callText(name, params, format) + "\n```";

export const fenceMarkdown = (content: string, format: ToolFormat): string =>
  format === "json"
    ? "```json\n" + JSON.stringify({ type: "markdown", content }) + "\n```"
    : "```xml\n<markdown>" + content + "</markdown>\n```";

export interface QuestionItem {
  id: string;
  type: "single" | "multi" | "text" | "confirm";
  label: string;
  options?: string[];
}

export const fenceQuestion = (
  questions: QuestionItem[],
  format: ToolFormat,
): string => {
  if (format === "json") {
    return (
      "```json\n" + JSON.stringify({ type: "question", questions }) + "\n```"
    );
  }
  const body = questions
    .map((q) => {
      const head = `<q id="${q.id}" type="${q.type}" label="${q.label.replace(/"/g, "&" + "quot;")}"`;
      if (!q.options || q.options.length === 0) {
        return `  ${head} />`;
      }
      const options = q.options
        .map((option) => `    <option>${option}</option>`)
        .join("\n");
      return `  ${head}>\n${options}\n  </q>`;
    })
    .join("\n");
  return "```xml\n<question>\n" + body + "\n</question>\n```";
};

interface ToolExample {
  params: ToolParams;
  note: string;
}

interface ToolDef {
  description: string;
  examples: ToolExample[];
}

const TOOL_DEFS: Record<OrchestratorToolName, ToolDef> = {
  conversation_title: {
    description:
      "Set or refresh the conversation title (UI action). Short, specific, in the user's language. Refresh it whenever the task changes.",
    examples: [{ params: { title: "Short title here" }, note: "set the title" }],
  },
  list_agents: {
    description:
      "List all agents with their type (executor/planner/reviewer), name, id and status (idle/working/waiting/blocked). Call it before delegating to see who exists and who is free.",
    examples: [{ params: {}, note: "no parameters" }],
  },
  create_agent: {
    description:
      "Create an agent. Required: agent_id (unique snake_case identifier: lowercase letters, digits and underscores, starting with a letter), agent_type (executor|planner|reviewer) and agent_name (human-readable); nothing else. Choose an agent_id that is not used by any agent in list_agents; send_message and delete_agent address the agent by this id. The agent only becomes available in a later turn: end the turn right after this call, then confirm with list_agents before send_message.",
    examples: [
      {
        params: {
          agent_id: "code_writer",
          agent_type: "executor",
          agent_name: "Code Writer",
        },
        note: "create an executor named 'Code Writer' with id 'code_writer'",
      },
      {
        params: {
          agent_id: "task_planner",
          agent_type: "planner",
          agent_name: "Task Planner",
        },
        note: "create a planner named 'Task Planner' with id 'task_planner'",
      },
    ],
  },
  delete_agent: {
    description:
      "Delete a sub-agent by agent_id (the id shown by list_agents). Its pending work is cancelled and its reply will not arrive. The orchestrator cannot be deleted. Required: agent_id.",
    examples: [
      {
        params: { agent_id: "task_planner" },
        note: "delete the agent with id 'task_planner'",
      },
    ],
  },
  send_message: {
    description:
      "Send a message to one agent by agent_id. Required: agent_id and message. The message follows the Message format in WORKFLOW and is self-contained: the agent cannot see your context or your tool results. The agent's reply arrives later as an incoming message; never predict it.",
    examples: [
      {
        params: {
          agent_id: "task_planner",
          message:
            "TYPE: TASK\nGOAL: plan JWT authentication for the API.\nCONTEXT: src/auth/; follow the pattern in src/auth/session.ts.\nINPUT: none\nEXPECTED OUTPUT: a PLAN.",
        },
        note: "send a task to the agent with id 'task_planner'",
      },
      {
        params: {
          agent_id: "code_writer",
          message:
            "TYPE: PLAN\nGOAL: implement the authentication endpoints.\nCONTEXT: follow the AGENTS.md conventions.\nINPUT: [the full PLAN copied from the planner]\nEXPECTED OUTPUT: a RESULT.",
        },
        note: "send the approved plan to 'code_writer'",
      },
    ],
  },
  list_tasks: {
    description:
      "List the tasks of the current project (archived tasks excluded) with id, title, status (todo|progress|review|done), priority (low|medium|high), due_date (YYYY-MM-DD or null), session_id and workflow_id (null = the task has no workflow yet). Optional: status filter.",
    examples: [
      { params: {}, note: "list every task" },
      { params: { status: "todo" }, note: "list only tasks with status todo" },
    ],
  },
  get_task: {
    description:
      "Get the full detail of one task: the list_tasks fields plus description, branch_name, start_date, depends_on, tags, checklist, attachments, archived, created_at and updated_at. Required: task_id.",
    examples: [
      {
        params: { task_id: "task_1730000000000_ab12cd34e" },
        note: "get the detail of one task",
      },
    ],
  },
  create_task: {
    description:
      "Create a task in the current project. Required: title. Optional: description, priority (low|medium|high, default medium), due_date (YYYY-MM-DD). The task starts as todo and has no workflow; the result returns its task_id.",
    examples: [
      {
        params: {
          title: "Add slugify utility",
          description: "Add a slugify helper to src/utils and use it in the post title field.",
          priority: "medium",
        },
        note: "create a medium-priority task",
      },
    ],
  },
  update_task: {
    description:
      "Update an existing task. Required: task_id plus at least one of title, description, status (todo|progress|review|done), priority (low|medium|high), due_date (YYYY-MM-DD).",
    examples: [
      {
        params: { task_id: "task_1730000000000_ab12cd34e", status: "progress" },
        note: "move a task to progress",
      },
    ],
  },
  assign_task: {
    description:
      "Assign an existing task to yourself, the orchestrator of the current workspace session. Required: task_id.",
    examples: [
      {
        params: { task_id: "task_1730000000000_ab12cd34e" },
        note: "assign the task to yourself",
      },
    ],
  },
  create_workflow: {
    description:
      "Create the workflow document (Markdown) of an EXISTING task and attach it to that task in the same step. Required: task_id and content (the complete workflow). A task has at most one workflow: the call fails if the task does not exist or already has a workflow; change an existing workflow with update_workflow.",
    examples: [
      {
        params: {
          task_id: "task_1730000000000_ab12cd34e",
          content:
            "# Workflow\n\n1. planner: plan the change\n2. executor: implement the plan\n3. reviewer: verify against ACCEPTANCE",
        },
        note: "create and attach a workflow to the task",
      },
    ],
  },
  get_workflow: {
    description:
      "Return the complete content of a task's workflow file. Required: task_id. Call it before update_workflow so old_content can be copied exactly.",
    examples: [
      {
        params: { task_id: "task_1730000000000_ab12cd34e" },
        note: "read the whole workflow of the task",
      },
    ],
  },
  update_workflow: {
    description:
      "Edit a task's workflow by exact text replacement. Required: task_id, old_content (must match the current content byte for byte and occur exactly once) and new_content (may be empty to delete the matched text).",
    examples: [
      {
        params: {
          task_id: "task_1730000000000_ab12cd34e",
          old_content: "3. reviewer: verify against ACCEPTANCE",
          new_content: "3. reviewer: verify against ACCEPTANCE\n4. report to the user",
        },
        note: "replace one part of the workflow",
      },
    ],
  },
};

const renderToolDocs = (format: ToolFormat): string =>
  ORCHESTRATOR_TOOLS.map((tool) => {
    const def = TOOL_DEFS[tool];
    const examples = def.examples
      .map(
        (example) =>
          `  - ${tick(callText(tool, example.params, format))} — ${example.note}`,
      )
      .join("\n");
    return `**${tool}**: ${def.description}\n${examples}`;
  }).join("\n");

const jsonNote =
  "JSON-STRINGS: escape every newline as backslash + n, every double quote as backslash + double quote and every backslash as two backslashes. Never use HTML entities. One object per fenced json block.";

const uiDocs = (format: ToolFormat): string =>
  format === "json"
    ? "UI objects (not tools): " +
      tick('{"type":"markdown","content":"..."}') +
      " for your reply to the user, and " +
      tick('{"type":"question","questions":[...]}') +
      " to ask the user."
    : "UI tags (not tools): " +
      tick("<markdown>reply to the user</markdown>") +
      " for your reply to the user, and " +
      tick("<question>...</question>") +
      " to ask the user.";

const questionDocs = (format: ToolFormat): string => {
  const confirm = fenceQuestion(
    [
      {
        id: "1",
        type: "confirm",
        label:
          "The change touches 6 files, including shared types. Proceed with all of them?",
      },
    ],
    format,
  );
  const single = fenceQuestion(
    [
      {
        id: "1",
        type: "single",
        label: "Which auth approach should the planner use?",
        options: [
          "JWT in an httpOnly cookie (recommended — matches src/auth/session.ts and needs no new dependency)",
          "Server-side sessions (valid, but needs a session store that does not exist yet)",
        ],
      },
    ],
    format,
  );
  return [
    "## question — ask the user",
    "Put every open question in ONE question block. Inner types: single (pick one, at least 2 options), multi (pick several, at least 2 options), text (free answer, no options), confirm (yes/no, no options). Every inner question needs id, type and label.",
    "PRIORITIZE-AND-CONFIRM: form your own recommendation before asking. One clearly best path → a confirm whose label states the proposal and the reason. Real trade-offs → single with the best option FIRST, marked (recommended — reason), and a one-line trade-off on each other option. Never offer an unranked list.",
    "If the user answers only some of the questions, re-ask only the unanswered ones.",
    confirm,
    single,
  ].join("\n\n");
};

export const buildOrchestratorToolsReference = (
  toolFormat: ToolFormat = "xml",
): string => {
  const how =
    toolFormat === "json"
      ? "Every tool call is one JSON object in its own fenced json block: " +
        tick('{"tool":"<name>","params":{...}}') +
        "."
      : "Every tool call is one XML tag, for example " +
        tick("<list_agents />") +
        ".";
  return [
    toolFormat === "json" ? "# TOOLS (JSON FORMAT)" : "# TOOLS",
    "The orchestrator is the coordinating brain of the workflow. It has NO file, command, git, skill or memory tools and cannot read or change the codebase. It sets the conversation title, manages agents, sends messages to them, manages the project's tasks and their workflow documents, and asks the user through the question UI.",
    how,
    toolFormat === "json" ? jsonNote : "",
    renderToolDocs(toolFormat),
    uiDocs(toolFormat),
    questionDocs(toolFormat),
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
};