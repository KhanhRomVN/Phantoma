import { MAX_READ_LINES_PER_TURN } from "@renderer/modules/Code/prompts/code/mode-config";
import type { ToolFormat } from "../code/mode-config";

export type ExecutorToolName =
  | "read_file"
  | "write_to_file"
  | "replace_in_file"
  | "list_files"
  | "find_files"
  | "grep"
  | "delete_file"
  | "run_command"
  | "git_status"
  | "git_diff"
  | "commit_message"
  | "revert_file"
  | "view_replace_history"
  | "read_skill"
  | "send_message";

export type ToolParams = Record<string, string | number>;

export const EXECUTOR_TOOLS: ExecutorToolName[] = [
  "read_file",
  "write_to_file",
  "replace_in_file",
  "list_files",
  "find_files",
  "grep",
  "delete_file",
  "run_command",
  "git_status",
  "git_diff",
  "commit_message",
  "revert_file",
  "view_replace_history",
  "read_skill",
  "send_message",
];

export const tick = (text: string): string => "`" + text + "`";

export const callText = (
  name: ExecutorToolName,
  params: ToolParams,
  format: ToolFormat,
): string => {
  if (format === "json") {
    return JSON.stringify({ tool: name, params });
  }
  if (Object.keys(params).length === 0) {
    return `<${name} />`;
  }
  const inner = Object.entries(params)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join("");
  return `<${name}>${inner}</${name}>`;
};

export const fenceCall = (
  name: ExecutorToolName,
  params: ToolParams,
  format: ToolFormat,
): string => "```" + format + "\n" + callText(name, params, format) + "\n```";

interface ToolExample {
  params: ToolParams;
  note: string;
}

interface ToolDef {
  description: string;
  examples: ToolExample[];
}

const TOOL_DEFS: Record<ExecutorToolName, ToolDef> = {
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
  write_to_file: {
    description:
      "Create a new file or fully overwrite one. Use replace_in_file for edits to existing files.",
    examples: [
      {
        params: { file_path: "path/to/file", content: "full file content" },
        note: "create a file",
      },
    ],
  },
  replace_in_file: {
    description:
      "Replace an exact snippet of an existing file. old_content must match the file byte for byte and occur exactly once.",
    examples: [
      {
        params: {
          file_path: "path/to/file",
          old_content: "exact original",
          new_content: "replacement",
        },
        note: "minimal targeted edit",
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
  delete_file: {
    description: "Delete a file that is fully superseded.",
    examples: [{ params: { file_path: "path/to/file" }, note: "delete a file" }],
  },
  run_command: {
    description:
      "Execute a shell command in the workspace root (or in folder_path). stdin is a pipe, not a TTY. A non-zero exit code means failure: analyze stderr before continuing.",
    examples: [
      { params: { command: "npx tsc --noEmit" }, note: "workspace root" },
      {
        params: { command: "npm run build", folder_path: "src" },
        note: "inside a subfolder",
      },
    ],
  },
  git_status: {
    description: "Show the working-tree state (modified/staged files).",
    examples: [{ params: {}, note: "no parameters" }],
  },
  git_diff: {
    description: "Show the actual diff of pending changes.",
    examples: [{ params: {}, note: "no parameters" }],
  },
  commit_message: {
    description:
      "Generate a commit message from the current diff. Review git_diff first.",
    examples: [{ params: {}, note: "no parameters" }],
  },
  revert_file: {
    description:
      "Undo the last change to a file, or revert to a specific replace_in_file version (deletes all later versions).",
    examples: [
      { params: { file_path: "path/to/file" }, note: "single undo" },
      {
        params: { file_path: "path/to/file", version: 3 },
        note: "back to version 3",
      },
    ],
  },
  view_replace_history: {
    description:
      "List every replace_in_file version of a file with error/warning counts. Use before revert_file.",
    examples: [
      { params: { file_path: "path/to/file" }, note: "show history" },
    ],
  },
  read_skill: {
    description: "Read the full instructions of an installed skill by its id.",
    examples: [{ params: { skill_id: "skill_id" }, note: "read a skill" }],
  },
  send_message: {
    description:
      "Send your final result to the orchestrator. agent_id MUST be orchestrator: you can talk to no other agent and never to the user. Use it exactly once per turn, as the LAST call, after all other tool calls are finished. The message must be self-contained: the orchestrator cannot see your tool results.",
    examples: [
      {
        params: {
          agent_id: "orchestrator",
          message: "STATUS: COMPLETE\nCHANGES: ...\nVERIFICATION: ...",
        },
        note: "report back to orchestrator",
      },
    ],
  },
};

const renderToolDocs = (format: ToolFormat): string =>
  EXECUTOR_TOOLS.map((tool) => {
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

export const buildExecutorToolsReference = (
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
    "The executor has the full file and command toolset. It writes code, edits files, runs commands, manages git. It has no memory tools and does not set the conversation title (the orchestrator does). The executor can only communicate with the orchestrator via send_to_agent.",
    how,
    jsonNote,
    LINE_BUDGET_NOTE,
    renderToolDocs(toolFormat),
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
};