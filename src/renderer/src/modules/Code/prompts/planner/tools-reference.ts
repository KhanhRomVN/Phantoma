import { MAX_READ_LINES_PER_TURN } from "@renderer/modules/Code/prompts/code/mode-config";
import type { ToolFormat } from "../code/mode-config";

export type PlannerToolName =
  | "read_file"
  | "list_files"
  | "find_files"
  | "grep"
  | "run_command"
  | "send_message";

export type ToolParams = Record<string, string | number>;

export const PLANNER_TOOLS: PlannerToolName[] = [
  "read_file",
  "list_files",
  "find_files",
  "grep",
  "run_command",
  "send_message",
];

export const tick = (text: string): string => "`" + text + "`";

export const callText = (
  name: PlannerToolName,
  params: ToolParams,
  format: ToolFormat,
): string => {
  if (format === "json") {
    return JSON.stringify({ tool: name, params });
  }
  const inner = Object.entries(params)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join("");
  return `<${name}>${inner}</${name}>`;
};

export const fenceCall = (
  name: PlannerToolName,
  params: ToolParams,
  format: ToolFormat,
): string => "```" + format + "\n" + callText(name, params, format) + "\n```";

interface ToolDef {
  description: string;
  examples: { params: ToolParams; note: string }[];
}

const TOOL_DEFS: Record<PlannerToolName, ToolDef> = {
  read_file: {
    description:
      "Read a file. Optional start_line/end_line read only a slice. Always read a file before relying on its content.",
    examples: [
      { params: { file_path: "path/to/file" }, note: "whole file" },
      {
        params: { file_path: "path/to/file", start_line: 1, end_line: 50 },
        note: "slice of a large file",
      },
    ],
  },
  list_files: {
    description:
      "List files and folders under a path (respects .gitignore); every file shows its exact line count. Omit depth for one level, or pass a number or max.",
    examples: [
      { params: { folder_path: "path/to/folder" }, note: "shallow listing" },
      {
        params: { folder_path: "path/to/folder", depth: "max" },
        note: "full subtree",
      },
    ],
  },
  find_files: {
    description:
      "Find files by name or pattern (one name per call, respects .gitignore); every match shows its line count.",
    examples: [
      { params: { file_name: "filename.ts" }, note: "whole workspace" },
      {
        params: { file_name: "*.test.ts", folder_path: "src/components" },
        note: "scoped to a folder",
      },
    ],
  },
  grep: {
    description:
      "Case-insensitive JavaScript regex search inside files. Provide file_path OR folder_path. Results include line numbers and each file's line count.",
    examples: [
      {
        params: { search_term: "import.*ContextMenu", folder_path: "src" },
        note: "search a folder",
      },
      {
        params: { search_term: "export function", file_path: "path/to/file" },
        note: "search one file",
      },
    ],
  },
  run_command: {
    description:
      "Execute a shell command in the workspace root (or in folder_path). For the planner this is for INSPECTION ONLY: git status/diff/log, type-check, listing dependencies, reading config. Never run a command that changes files, installs packages, commits or touches git state. stdin is a pipe, not a TTY. A non-zero exit code means failure: analyze stderr before continuing.",
    examples: [
      { params: { command: "git status --short" }, note: "workspace root" },
      {
        params: { command: "npx tsc --noEmit", folder_path: "src" },
        note: "inside a subfolder",
      },
    ],
  },
  send_message: {
    description:
      "Send your final message to the orchestrator. agent_id MUST be orchestrator: you can talk to no other agent and never to the user. Use it exactly once per turn, as the LAST call, after all other tool calls are finished. The message is your PLAN, or a BLOCKED/QUESTION message. It must be self-contained: the orchestrator cannot see your tool results.",
    examples: [
      {
        params: {
          agent_id: "orchestrator",
          message: "TYPE: PLAN\nSTATUS: OK\nBODY:\n1. GOAL: ...\n2. FILES: ...",
        },
        note: "deliver the plan",
      },
    ],
  },
};

const renderToolDocs = (format: ToolFormat): string =>
  PLANNER_TOOLS.map((tool) => {
    const def = TOOL_DEFS[tool];
    const examples = def.examples
      .map(
        (example) =>
          `  - ${tick(callText(tool, example.params, format))} — ${example.note}`,
      )
      .join("\n");
    return `**${tool}**: ${def.description}\n${examples}`;
  }).join("\n");

const LINE_BUDGET_NOTE = `## File Line-Count Metadata & READ-LINE-BUDGET
list_files, find_files and grep results include the exact line count of every file they return. Before batching read_file calls, sum those counts and keep the total at or under ${MAX_READ_LINES_PER_TURN} lines per turn; read oversized files as a slice with start_line/end_line. Never guess a line count: call list_files, find_files or grep first.`;

export const buildPlannerToolsReference = (
  toolFormat: ToolFormat = "xml",
): string => {
  const how =
    toolFormat === "json"
      ? "Every tool call is one JSON object in its own fenced json block: " +
        tick('{"tool":"<name>","params":{...}}') +
        "."
      : "Every tool call is one XML tag, for example " +
        tick("<read_file><file_path>path</file_path></read_file>") +
        ".";
  const jsonNote =
    toolFormat === "json"
      ? "⚠ JSON-STRINGS: escape every newline as backslash + n, every double quote as backslash + double quote and every backslash as two backslashes. Never use HTML entities. One object per fenced json block."
      : "";
  return [
    toolFormat === "json" ? "# TOOLS (JSON FORMAT)" : "# TOOLS",
    "The planner only plans. It has read-only exploration tools, run_command for inspection only, and send_message to reach the orchestrator. It has no write, edit, delete, git-commit, skill, memory or conversation-title tools.",
    how,
    jsonNote,
    LINE_BUDGET_NOTE,
    renderToolDocs(toolFormat),
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
};