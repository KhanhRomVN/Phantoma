import { MAX_READ_LINES_PER_TURN } from "../../code/mode-config";
import type { ToolFormat } from "./types";

export type ToolName =
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
  | "read_memory"
  | "update_memory"
  | "conversation_title";

export type ToolParams = Record<string, string | number>;

interface ToolExample {
  params: ToolParams;
  note: string;
}

interface ToolDef {
  description: string;
  examples: ToolExample[];
}

export const ALL_TOOLS: ToolName[] = [
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
  "read_memory",
  "update_memory",
  "conversation_title",
];

export const tick = (text: string): string => "`" + text + "`";

const nameList = (names: ToolName[]): string => names.map(tick).join(", ");

const TEXT_CONTENT_PARAM: Partial<Record<ToolName, string>> = {
  read_skill: "skill_id",
  conversation_title: "title",
};

export const callText = (
  name: ToolName,
  params: ToolParams,
  format: ToolFormat,
): string => {
  if (format === "json") {
    return JSON.stringify({ tool: name, params });
  }
  if (name === "read_memory") {
    return "<read_memory />";
  }
  const textParam = TEXT_CONTENT_PARAM[name];
  if (textParam) {
    return `<${name}>${params[textParam]}</${name}>`;
  }
  const inner = Object.entries(params)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join("");
  return `<${name}>${inner}</${name}>`;
};

export const fenceCall = (
  name: ToolName,
  params: ToolParams,
  format: ToolFormat,
): string =>
  "```" + format + "\n" + callText(name, params, format) + "\n```";

export const fenceMarkdown = (content: string, format: ToolFormat): string =>
  format === "json"
    ? "```json\n" + JSON.stringify({ type: "markdown", content }) + "\n```"
    : "```xml\n<markdown>" + content + "</markdown>\n```";

const TOOL_DEFS: Record<ToolName, ToolDef> = {
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
      { params: { file_path: "path/to/file", version: 3 }, note: "back to version 3" },
    ],
  },
  view_replace_history: {
    description:
      "List every replace_in_file version of a file with error/warning counts. Use before revert_file.",
    examples: [{ params: { file_path: "path/to/file" }, note: "show history" }],
  },
  read_skill: {
    description: "Read the full instructions of an installed skill by its id.",
    examples: [{ params: { skill_id: "skill_id" }, note: "read a skill" }],
  },
  read_memory: {
    description:
      "Read the global memory file. Takes no parameters. Always call it right before update_memory.",
    examples: [{ params: {}, note: "no parameters" }],
  },
  update_memory: {
    description:
      "Exact-match replace inside memory.md (like replace_in_file, no file_path). Use an empty old_content only for the very first write. Store only durable, cross-project facts, never secrets.",
    examples: [
      {
        params: { old_content: "exact original", new_content: "replacement" },
        note: "edit memory",
      },
    ],
  },
  conversation_title: {
    description:
      "Set or refresh the conversation title (UI action, not an executable tool). Short, specific, in the user's language. Refresh it whenever the task changes.",
    examples: [{ params: { title: "Short title here" }, note: "set the title" }],
  },
};

export const LINE_BUDGET_NOTE = `## File Line-Count Metadata & READ-LINE-BUDGET
list_files, find_files and grep results include the exact line count of every file they return. Before batching read_file calls, sum those counts and keep the total at or under ${MAX_READ_LINES_PER_TURN} lines per turn; read oversized files as a slice with start_line/end_line. Never guess a line count: call list_files, find_files or grep first.`;

const renderToolDocs = (tools: ToolName[], format: ToolFormat): string =>
  tools
    .map((tool) => {
      const def = TOOL_DEFS[tool];
      const examples = def.examples
        .map(
          (example) =>
            `  - ${tick(callText(tool, example.params, format))} — ${example.note}`,
        )
        .join("\n");
      return `**${tool}**: ${def.description}\n${examples}`;
    })
    .join("\n");

const formatNotes = (tools: ToolName[], format: ToolFormat): string => {
  const notes: string[] = [];
  if (format === "json") {
    notes.push(
      "JSON-STRINGS: escape every newline as backslash + n, every double quote as backslash + double quote and every backslash as two backslashes. Never use HTML entities. One object per fenced json block.",
    );
  } else {
    if (tools.includes("replace_in_file") || tools.includes("update_memory")) {
      notes.push(
        "TAG-CLOSE-VERIFY: the closing tag after new_content must be </new_content>, never </old_content>.",
      );
    }
    if (tools.includes("write_to_file") || tools.includes("replace_in_file")) {
      notes.push(
        "NO-HTML-ENTITIES: write raw code characters inside content, old_content and new_content, with real newlines.",
      );
    }
  }
  if (tools.includes("replace_in_file")) {
    notes.push(
      "BYTE-PERFECT: old_content must match the file exactly: indentation, spacing, no reformatting.",
    );
  }
  return notes.map((note) => "⚠ " + note).join("\n");
};

const uiDocs = (format: ToolFormat): string =>
  format === "json"
    ? "UI objects (not tools, one per fenced json block): " +
      tick('{"type":"markdown","content":"..."}') +
      " for prose and handoffs, " +
      tick('{"type":"code","language":"ts","content":"..."}') +
      " for read-only code display."
    : "UI tags (not tools): " +
      tick("<markdown>prose and handoffs</markdown>") +
      ", " +
      tick('<code language="ts">read-only code display</code>') +
      ".";

export const buildToolsSection = (
  tools: ToolName[],
  format: ToolFormat,
  intro: string,
): string => {
  const header = format === "json" ? "# TOOLS (JSON FORMAT)" : "# TOOLS";
  const how =
    format === "json"
      ? "Every tool call is one JSON object in its own fenced json block: " +
        tick('{"tool":"<name>","params":{...}}') +
        "."
      : "Every tool call is one XML tag, for example " +
        tick("<read_file><file_path>path</file_path></read_file>") +
        ".";
  return [
    header,
    intro,
    how,
    formatNotes(tools, format),
    LINE_BUDGET_NOTE,
    renderToolDocs(tools, format),
    uiDocs(format),
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
};

export const buildValidationSection = (
  role: string,
  tools: ToolName[],
  format: ToolFormat,
): string => {
  const forbidden = ALL_TOOLS.filter((tool) => !tools.includes(tool));
  const forbiddenLine =
    forbidden.length > 0
      ? `Tools that exist in this application but are NOT available to the ${role}: ${nameList(forbidden)}. Never emit them; if you need something only they can do, ask for it in a handoff.`
      : "";
  const shapeRules =
    format === "json"
      ? 'Two legal shapes only: a tool call (top-level "tool" key with "params") and a UI object (top-level "type" key: markdown | code). One object per fenced json block. Zero XML anywhere.'
      : "Tool calls are XML tags only; UI tags are markdown and code. Never wrap an XML tool call in a json fence.";
  return [
    format === "json"
      ? "# TOOL VALIDATION & ERROR PREVENTION (JSON FORMAT)"
      : "# TOOL VALIDATION & ERROR PREVENTION",
    `Valid tools for the ${role} (case-sensitive, lowercase with underscores): ${nameList(tools)}.`,
    forbiddenLine,
    shapeRules,
    "Invented names such as search_files, edit_file, create_file or get_file do not exist: use the real tool from the valid list.",
    "## Self-Check Before Sending Response\n- [ ] Every tool name is in the valid list for this role\n- [ ] Every tool has its required parameters\n- [ ] The block syntax matches the tool format exactly\n- [ ] No tool outside this role's list is used",
    "If you notice an invalid call: stop, pick the correct tool from the valid list, rewrite it, and re-check every other call in the response.",
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
};