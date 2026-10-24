import type { ToolFormat } from "../code/mode-config";

export type OrchestratorToolName =
  | "conversation_title"
  | "list_agents"
  | "create_agent"
  | "send_message";
export type ToolParams = Record<string, string | number>;

export const ORCHESTRATOR_TOOLS: OrchestratorToolName[] = [
  "conversation_title",
  "list_agents",
  "create_agent",
  "send_message",
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
      "List all created agents with their type (executor/planner/reviewer), name, id (snake_case of name), current status (idle/working/waiting/blocked), assigned provider/model/account, and the Zen tab linked to each. Call it before delegating to see who exists and who is free.",
    examples: [{ params: {}, note: "no parameters" }],
  },
  create_agent: {
    description:
      "Create a new agent with a specific type (executor, planner, or reviewer), give it a name, and assign provider/model/account. The agent_id is auto-generated from agent_name (converted to snake_case). Required: agent_type (executor|planner|reviewer), agent_name (human-readable), provider_id, model_id, account_id. The UI will ask for confirmation and allow changing model/account.",
    examples: [
      {
        params: {
          agent_type: "executor",
          agent_name: "Code Writer",
          provider_id: "deepseek",
          model_id: "deepseek-chat",
          account_id: "acc_123",
        },
        note: "create an executor named 'Code Writer' (id: code_writer)",
      },
      {
        params: {
          agent_type: "planner",
          agent_name: "Task Planner",
          provider_id: "anthropic",
          model_id: "claude-3-5-sonnet-20241022",
          account_id: "acc_456",
        },
        note: "create a planner named 'Task Planner' (id: task_planner)",
      },
    ],
  },
  send_message: {
    description:
      "Send a message to a specific agent by its agent_id (the snake_case version of agent_name from create_agent). The message must be self-contained: goal, relevant file paths, constraints from the user and from AGENTS.md, and the expected output. The receiving agent cannot see your context or your tool results. The agent's reply comes back later as an incoming message prefixed with its id; do not predict it.",
    examples: [
      {
        params: {
          agent_id: "task_planner",
          message: "GOAL: Plan the implementation of user authentication\nFILES: src/auth/\nCONSTRAINTS: Use JWT tokens, follow existing patterns in src/auth/session.ts\nEXPECTED OUTPUT: Step-by-step plan with file changes",
        },
        note: "send task to agent with id 'task_planner'",
      },
      {
        params: {
          agent_id: "code_writer",
          message: "GOAL: Implement the authentication endpoints\nPLAN: [previous planner output]\nEXPECTED OUTPUT: Code changes ready for review",
        },
        note: "send implementation task to 'code_writer'",
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
    ? "UI object (not a tool): " +
      tick('{"type":"markdown","content":"..."}') +
      " for your reply to the user."
    : "UI tag (not a tool): " +
      tick("<markdown>reply to the user</markdown>") +
      ".";

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
    "The orchestrator is the coordinating brain of the workflow. It has NO file, command, git, skill or memory tools: it cannot read or change the codebase. It only sets the conversation title, inspects the available models/accounts and the agents, and sends messages to sub-agents.",
    how,
    toolFormat === "json" ? "⚠ " + jsonNote : "",
    renderToolDocs(toolFormat),
    uiDocs(toolFormat),
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
};