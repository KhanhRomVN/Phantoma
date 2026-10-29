import type { ToolFormat } from "./code/mode-config";
import { buildPlannerToolFormatReminder } from "./planner/tool-format-reminder";
import { buildExecutorToolFormatReminder } from "./executor/tool-format-reminder";
import { buildReviewerToolFormatReminder } from "./reviewer/tool-format-reminder";
import { buildTesterToolFormatReminder } from "./tester/tool-format-reminder";

const BUILDERS: Record<string, (toolFormat: ToolFormat) => string> = {
  planner: buildPlannerToolFormatReminder,
  executor: buildExecutorToolFormatReminder,
  reviewer: buildReviewerToolFormatReminder,
  tester: buildTesterToolFormatReminder,
};

export const isReminderSubAgent = (agentId?: string | null): boolean =>
  !!agentId && agentId in BUILDERS;

export const buildSubAgentFormatReminder = (
  agentId: string,
  toolFormat: ToolFormat,
): string => BUILDERS[agentId](toolFormat);