export type ToolFormat = "xml" | "json";

export type SystemPromptMode = "balanced";

export interface SystemInfo {
  os: string;
  shell: string;
  homeDir: string;
  cwd: string;
  language: string;
}

export interface ModeBehaviorConfig {
  askConfirmation: "minimal" | "moderate" | "extensive" | "almost-never";
  commentStyle: "minimal" | "standard" | "comprehensive";
  testBehavior: "none" | "propose-existing" | "write-new";
  explanationLevel: "one-line" | "brief" | "detailed";
  readBeforeEdit: boolean;
  maxBatchSize: number;
  runVerifyAfterChange: boolean;
}

export const MODE_BEHAVIORS: Record<SystemPromptMode, ModeBehaviorConfig> = {
  balanced: {
    askConfirmation: "moderate",
    commentStyle: "standard",
    testBehavior: "propose-existing",
    explanationLevel: "brief",
    readBeforeEdit: true,
    maxBatchSize: 3,
    runVerifyAfterChange: false,
  },
};

export const MAX_READ_LINES_PER_TURN = 1500;

export interface WorkflowAgentPromptConfig {
  toolFormat: ToolFormat;
  language: string;
  systemInfo: SystemInfo;
  mode?: SystemPromptMode;
}

export const joinSections = (...sections: (string | null | undefined)[]): string =>
  sections.filter((s): s is string => Boolean(s?.trim())).join("\n\n");