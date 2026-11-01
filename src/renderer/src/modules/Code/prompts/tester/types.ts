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
  askConfirmation: "moderate";
  commentStyle: "standard";
  testBehavior: "propose-existing";
  explanationLevel: "brief";
  readBeforeEdit: true;
  maxBatchSize: 3;
  runVerifyAfterChange: false;
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

export interface WorkflowAgentPromptConfig {
  toolFormat: ToolFormat;
  language: string;
  systemInfo: SystemInfo;
  mode?: SystemPromptMode;
  promptLengthMode?: "short" | "medium" | "long" | "full" | "none";
}

export const joinSections = (...sections: (string | null | undefined)[]): string =>
  sections.filter((s): s is string => Boolean(s?.trim())).join("\n\n");