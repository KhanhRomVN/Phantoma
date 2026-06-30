export type QuestionType = 'single' | 'multi' | 'text' | 'confirm';

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  options?: string[];
}

export interface QuestionAnswer {
  questionId: string;
  value: string | string[] | boolean;
}

export interface ToolAction {
  type:
    | "read_file"
    | "write_to_file"
    | "replace_in_file"
    | "list_files"
    | "run_command"
    | "execute_agent_action"
    | "delete_file"
    | "delete_folder"
    | "move_file"
    | "grep"
    | "git_status"
    | "commit_message"
    | "git_diff";
  params: Record<string, any>;
  rawXml: string;
  isPartial?: boolean;
}

export type ContentBlock =
  | { type: "code"; content: string; language?: string }
  | { type: "html"; content: string }
  | { type: "file"; content: string }
  | { type: "markdown"; content: string }
  | {
      type: "question";
      options: string[];
      title?: string;
      optional?: boolean;
      questions?: Question[];
    }
  | {
      type: "mixed_content";
      segments: (
        | { type: "markdown"; content: string }
        | { type: "code"; content: string; language?: string }
      )[];
    }
  | { type: "tool"; action: ToolAction; actionIndex?: number }
  | { type: "thinking"; content: string };

export interface ParsedResponse {
  followupQuestion: string | null;
  followupOptions: string[] | null;
  taskName: string | null;
  actions: ToolAction[];
  contentBlocks: ContentBlock[];
  displayText: string;
  question: ContentBlock | null;
}