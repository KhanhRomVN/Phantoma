import { MAX_READ_LINES_PER_TURN } from "../code/mode-config";
import type { ToolFormat } from "../code/mode-config";

export type TesterToolName =
  | "read_file"
  | "write_to_file"
  | "replace_in_file"
  | "list_files"
  | "find_files"
  | "grep"
  | "run_command"
  | "send_message";

export type ToolParams = Record<string, string | number>;

export const TESTER_TOOLS: TesterToolName[] = [
  "read_file",
  "write_to_file",
  "replace_in_file",
  "list_files",
  "find_files",
  "grep",
  "run_command",
  "send_message",
];

export const HANDOFF_TOOL: TesterToolName = "send_message";
export const HANDOFF_AGENT = "orchestrator";

export const tick = (text: string): string => "`" + text + "`";

export const callText = (
  name: TesterToolName,
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
  name: TesterToolName,
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

const TOOL_DEFS: Record<TesterToolName, ToolDef> = {
  read_file: {
    description:
      "Read a file. Optional start_line/end_line read only a slice. Always read the code under test and a neighbouring test file before writing a test.",
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
      "Create a NEW test file (or fixture) with full content. Only for test files and test fixtures; never for source files. Use replace_in_file to change an existing file.",
    examples: [
      {
        params: {
          file_path: "src/utils/slugify.test.ts",
          content: "full test file content",
        },
        note: "create a new test file",
      },
    ],
  },
  replace_in_file: {
    description:
      "Replace one exact snippet in an existing TEST file. old_content must match byte-for-byte. Never use it on source files.",
    examples: [
      {
        params: {
          file_path: "src/utils/slugify.test.ts",
          old_content: "exact original",
          new_content: "replacement",
        },
        note: "edit an existing test",
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
      "Find files by name or pattern (one name per call, respects .gitignore); every match shows its line count. Use it to locate existing tests and test config.",
    examples: [
      { params: { file_name: "*.test.ts" }, note: "whole workspace" },
      {
        params: { file_name: "*.spec.ts", folder_path: "src/components" },
        note: "scoped to a folder",
      },
    ],
  },
  grep: {
    description:
      "Case-insensitive JavaScript regex search inside files. Provide file_path OR folder_path. Results include line numbers and each file's line count.",
    examples: [
      {
        params: { search_term: "describe\\(", folder_path: "src" },
        note: "find existing test suites",
      },
      {
        params: { search_term: "export function", file_path: "path/to/file" },
        note: "list exports of one file",
      },
    ],
  },
  run_command: {
    description:
      "Execute a shell command to RUN tests and checks: the project's test command, a single test file, type check, lint without fix flags. Never install packages, never change source files, never touch git state, never start a dev server or watch mode (use the single-run flag of the test runner). stdin is a pipe, not a TTY. A non-zero exit code means failure: analyze stderr before continuing.",
    examples: [
      {
        params: { command: "npx vitest run src/utils/slugify.test.ts" },
        note: "run one test file once",
      },
      {
        params: { command: "npm test", folder_path: "src" },
        note: "run the existing suite",
      },
    ],
  },
  send_message: {
    description:
      "Send your final report to the orchestrator. agent_id MUST be orchestrator: you can talk to no other agent and never to the user. Use it exactly once per turn, as the LAST call, after all other tool calls are finished. The message must be self-contained: the orchestrator cannot see your tool results.",
    examples: [
      {
        params: {
          agent_id: "orchestrator",
          message:
            "FROM: tester\nTO: orchestrator\nTYPE: TEST_REPORT\nSTATUS: OK\nBODY:\n1. VERDICT: PASS.\n2. TESTS WRITTEN: ...\n3. FAILURES: none.\n4. COMMANDS RUN: ...",
        },
        note: "report test results to orchestrator",
      },
    ],
  },
};

const renderToolDocs = (format: ToolFormat): string =>
  TESTER_TOOLS.map((tool) => {
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

export const buildTesterToolsReference = (
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
    "The tester reads code, writes and edits TEST files only, and runs tests with run_command. It has no delete, revert, git or memory tools. The tester can only communicate with the orchestrator via send_message.",
    how,
    jsonNote,
    LINE_BUDGET_NOTE,
    renderToolDocs(toolFormat),
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
};