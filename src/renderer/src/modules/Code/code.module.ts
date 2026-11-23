import type { ZenModule } from '@renderer/components/Widgets/Zen/feature/Chat/services/moduleRegistry';
import { CODE_TAG_REGISTRY } from './agent/tag-registry';
import { CAPABILITIES as CODE_CAPABILITIES } from './agent/prompts/code/config';
import { CAPABILITIES as ORCHESTRATOR_CAPABILITIES } from './agent/prompts/orchestrator/config';
import { CAPABILITIES as PLANNER_CAPABILITIES } from './agent/prompts/planner/config';
import { CAPABILITIES as EXECUTOR_CAPABILITIES } from './agent/prompts/executor/config';
import { CAPABILITIES as REVIEWER_CAPABILITIES } from './agent/prompts/reviewer/config';
import { CAPABILITIES as TESTER_CAPABILITIES } from './agent/prompts/tester/config';
import type { ExecutorOptions } from '@renderer/components/Widgets/Zen/feature/Chat/types/executor-types';
import { CommitMessageRenderer, executeCommitMessage, parseCommitMessage } from './agent/tools/commit-message';
import { DeleteFileRenderer, executeDeleteFile, parseDeleteFile } from './agent/tools/delete-file';
import { FindFilesRenderer, executeFindFiles, parseFindFiles } from './agent/tools/find-files';
import { GitDiffRenderer, executeGitDiff, parseGitDiff } from './agent/tools/git-diff';
import { GitStatusRenderer, executeGitStatus, parseGitStatus } from './agent/tools/git-status';
import { GrepRenderer, executeGrep, parseGrep } from './agent/tools/grep';
import { ListFilesRenderer, executeListFiles, parseListFiles } from './agent/tools/list-files';
import { ReadFileRenderer, executeReadFile, parseReadFile } from './agent/tools/read-file';
import { ReadMemoryRenderer, executeReadMemory, parseReadMemory } from './agent/tools/read-memory';
import { ReadSkillRenderer, executeReadSkill, parseReadSkill } from './agent/tools/read-skill';
import { ListAgentsRenderer, executeListAgents, parseListAgents } from './agent/tools/list-agents';
import { CreateAgentRenderer, executeCreateAgent, parseCreateAgent } from './agent/tools/create-agent';
import { SendMessageRenderer, executeSendMessage, parseSendMessage } from './agent/tools/send-message';
import { DeleteAgentRenderer, executeDeleteAgent, parseDeleteAgent } from './agent/tools/delete-agent';
import { ReplaceInFileRenderer, executeReplaceInFile, parseReplaceInFile } from './agent/tools/replace-in-file';
import { RunCommandRenderer, executeRunCommand, setRunCommandValidator, parseRunCommand } from './agent/tools/run-command';
import { UpdateMemoryRenderer, executeUpdateMemory, parseUpdateMemory } from './agent/tools/update-memory';
import { WriteToFileRenderer, executeWriteToFile, parseWriteToFile } from './agent/tools/write-to-file';
import { SecurityValidator } from './shared/utils/security.util';
import { executeMoveFile } from './agent/tools/move-file';

import { executeListTasks, parseListTasks, ListTasksRenderer } from './agent/tools/list-tasks';
import { executeGetTask, parseGetTask, GetTaskRenderer } from './agent/tools/get-task';
import { executeCreateTask, parseCreateTask, CreateTaskRenderer } from './agent/tools/create-task';
import { executeUpdateTask, parseUpdateTask, UpdateTaskRenderer } from './agent/tools/update-task';
import { executeAssignTask, parseAssignTask, AssignTaskRenderer } from './agent/tools/assign-task';
import { executeCreateWorkflow, parseCreateWorkflow, CreateWorkflowRenderer } from './agent/tools/create-workflow';
import { executeGetWorkflow, parseGetWorkflow, GetWorkflowRenderer } from './agent/tools/get-workflow';
import { executeUpdateWorkflow, parseUpdateWorkflow, UpdateWorkflowRenderer } from './agent/tools/update-workflow';
import {
  buildPromptForMode as buildCodePrompt,
  buildToolFormatReminder as buildCodeToolFormatReminder,
  type ToolFormat as CodeToolFormat,
} from './agent/prompts/code';
import { formatCodeAction, formatCodeCompletedTooltip } from './agent/services/tool-display-formatters';
import { registerActionDisplayFormatter } from '@renderer/components/Widgets/Zen/feature/Chat/utils/action-display-formatter';
import { registerCompletedTooltipFormatter as registerTooltipFormatter } from '@renderer/components/Widgets/Zen/feature/Chat/utils/status-tooltip-builder';
import { registerToolStatusChecker } from '@renderer/components/Widgets/Zen/feature/Chat/utils/tool-status-registry';
import { checkCodeToolStatus } from './agent/services/tool-status-checker';
import {
  checkCodeToolCollapse,
  checkCodeToolDanger,
  formatCodeToolForMarkdown,
} from './agent/services/tool-behaviors';
import { transformCodeToolOutput } from './agent/services/tool-output-transformer';
import {
  registerToolCollapseChecker,
  registerToolDangerChecker,
  registerToolMarkdownFormatter,
  registerToolOutputTransformer,
} from '@renderer/components/Widgets/Zen/feature/Chat/utils/tool-behavior-registry';
import { registerToolOutputFormatter } from '@renderer/components/Widgets/Zen/feature/Chat/utils/tool-output-registry';
import { registerStreamingTool } from '@renderer/components/Widgets/Zen/feature/Chat/utils/tool-streaming-registry';
import {
  registerMutationChecker,
  registerFilePathExtractor,
  registerSingleLineReviewChecker,
  registerDiffCalculator,
  registerRawContentDiffExtractor,
} from '@renderer/components/Widgets/Zen/feature/Chat/utils/tool-mutation-registry';
import { formatCodeToolOutput } from './agent/services/tool-output-formatter';
import {
  checkCodeToolMutation,
  extractCodeFilePath,
  checkCodeSingleLineReview,
  calculateCodeDiff,
} from './agent/services/tool-mutations';
import { extractCodeRawContentDiff } from './agent/services/raw-content-diff';
import { buildOrchestratorPrompt } from './agent/prompts/orchestrator';
import { buildPlannerPrompt } from './agent/prompts/planner';
import { buildExecutorPrompt } from './agent/prompts/executor';
import { buildReviewerPrompt } from './agent/prompts/reviewer';
import { buildTesterPrompt } from './agent/prompts/tester';

const bypass = (o?: ExecutorOptions) => o?.bypassIgnore ?? false;

setRunCommandValidator((command: string) => SecurityValidator.validateCommand(command));

// Register Code module display formatters
registerActionDisplayFormatter('code', formatCodeAction);
registerTooltipFormatter(formatCodeCompletedTooltip);

// Register Code module tool status checker
registerToolStatusChecker(checkCodeToolStatus);

// Register Code module tool behaviors
registerToolCollapseChecker(checkCodeToolCollapse);
registerToolDangerChecker(checkCodeToolDanger);
registerToolMarkdownFormatter(formatCodeToolForMarkdown);
registerToolOutputTransformer(transformCodeToolOutput);
registerToolOutputFormatter(formatCodeToolOutput);

// Register streaming tools (handle output via IPC, not direct storage)
registerStreamingTool('run_command');

// Register Code module mutation behaviors
registerMutationChecker(checkCodeToolMutation);
registerFilePathExtractor(extractCodeFilePath);
registerSingleLineReviewChecker(checkCodeSingleLineReview);
registerDiffCalculator(calculateCodeDiff);
registerRawContentDiffExtractor(extractCodeRawContentDiff);

export const codeModule: ZenModule = {
  tagRegistry: CODE_TAG_REGISTRY,
  id: 'code',
  services: {},
  capabilities: {
    multiAgent: true,
  },
  executors: {
    read_file: async (a, c, o) =>
      (await executeReadFile(a.params, bypass(o), c.folderPath))?.output || null,
    write_to_file: async (a, c, o) =>
      executeWriteToFile(a.params, bypass(o), c.conversationIdRef?.current, (a as any).actionId),
    replace_in_file: async (a, c, o) =>
      executeReplaceInFile(a.params, bypass(o), c.conversationIdRef?.current, (a as any).actionId),

    list_files: async (a, c, o) => executeListFiles(a.params, bypass(o), c.folderPath),
    find_files: async (a) => (await executeFindFiles(a.params))?.output || null,
    delete_file: async (a) => executeDeleteFile(a.params),
    grep: async (a) => executeGrep(a.params),
    git_diff: async (a, c) => {
      const filePath =
        typeof a.params === 'string' ? a.params : a.params?.path || a.params?.file_path || '';
      return executeGitDiff(
        filePath,
        (a as any).actionId || 'git-diff-' + Date.now(),
        c.folderPath ?? undefined,
      );
    },
    move_file: async (a) => executeMoveFile(a.params),
    run_command: async (a, ctx) => executeRunCommand(a, ctx),
    git_status: async (a, ctx) => executeGitStatus(a.params || {}, ctx),
    commit_message: async (a, ctx) => executeCommitMessage(a.params || {}, ctx),
    read_memory: async () => executeReadMemory(),
    update_memory: async (a) => executeUpdateMemory(a.params || {}),
    read_skill: async (a) => executeReadSkill(a.params || {}),
    list_agents: async () => executeListAgents(),
    create_agent: async (a) => executeCreateAgent(a.params),
    send_message: async (a, ctx) => executeSendMessage(a.params, ctx),
    delete_agent: async (a) => executeDeleteAgent(a.params),
    list_tasks: async (a) => executeListTasks(a.params),
    get_task: async (a) => executeGetTask(a.params),
    create_task: async (a) => executeCreateTask(a.params),
    update_task: async (a) => executeUpdateTask(a.params),
    assign_task: async (a) => executeAssignTask(a.params),
    create_workflow: async (a) => executeCreateWorkflow(a.params),
    get_workflow: async (a) => executeGetWorkflow(a.params),
    update_workflow: async (a) => executeUpdateWorkflow(a.params),
  },
  parsers: {
    read_file: parseReadFile,
    write_to_file: parseWriteToFile,
    replace_in_file: parseReplaceInFile,
    list_files: parseListFiles,
    find_files: parseFindFiles,
    grep: parseGrep,
    delete_file: parseDeleteFile,

    run_command: parseRunCommand,
    git_status: parseGitStatus,
    git_diff: parseGitDiff,
    commit_message: parseCommitMessage,
    read_memory: parseReadMemory,
    update_memory: parseUpdateMemory,
    read_skill: parseReadSkill,
    list_agents: parseListAgents,
    create_agent: parseCreateAgent,
    send_message: parseSendMessage,
    delete_agent: parseDeleteAgent,
    list_tasks: parseListTasks,
    get_task: parseGetTask,
    create_task: parseCreateTask,
    update_task: parseUpdateTask,
    assign_task: parseAssignTask,
    create_workflow: parseCreateWorkflow,
    get_workflow: parseGetWorkflow,
    update_workflow: parseUpdateWorkflow,
  },
  renderers: {
    read_file: ReadFileRenderer,
    list_files: ListFilesRenderer,
    find_files: FindFilesRenderer,
    grep: GrepRenderer,
    delete_file: DeleteFileRenderer,

    read_memory: ReadMemoryRenderer,
    update_memory: UpdateMemoryRenderer,
    read_skill: ReadSkillRenderer,
    git_diff: GitDiffRenderer,
    git_status: GitStatusRenderer,
    commit_message: CommitMessageRenderer,
    write_to_file: WriteToFileRenderer,
    replace_in_file: ReplaceInFileRenderer,
    run_command: RunCommandRenderer,

    list_agents: ListAgentsRenderer,
    create_agent: CreateAgentRenderer,
    send_message: SendMessageRenderer,
    delete_agent: DeleteAgentRenderer,
    list_tasks: ListTasksRenderer,
    get_task: GetTaskRenderer,
    create_task: CreateTaskRenderer,
    update_task: UpdateTaskRenderer,
    assign_task: AssignTaskRenderer,
    create_workflow: CreateWorkflowRenderer,
    get_workflow: GetWorkflowRenderer,
    update_workflow: UpdateWorkflowRenderer,
  },
  prompts: {
    systemPrompts: new Map([
      [
        'code',
        {
          getCapabilities: () => CODE_CAPABILITIES,
          buildPrompt: (config: any) => buildCodePrompt(config, config.mode ?? 'balanced'),
          buildToolFormatReminder: (format) =>
            buildCodeToolFormatReminder(format as CodeToolFormat),
        },
      ],
      [
        'orchestrator',
        {
          getCapabilities: () => ORCHESTRATOR_CAPABILITIES,
          buildPrompt: buildOrchestratorPrompt,
          buildToolFormatReminder: (format) =>
            buildCodeToolFormatReminder(format as CodeToolFormat),
        },
      ],
      [
        'planner',
        {
          getCapabilities: () => PLANNER_CAPABILITIES,
          buildPrompt: buildPlannerPrompt,
          buildToolFormatReminder: (format) =>
            buildCodeToolFormatReminder(format as CodeToolFormat),
        },
      ],
      [
        'executor',
        {
          getCapabilities: () => EXECUTOR_CAPABILITIES,
          buildPrompt: buildExecutorPrompt,
          buildToolFormatReminder: (format) =>
            buildCodeToolFormatReminder(format as CodeToolFormat),
        },
      ],
      [
        'reviewer',
        {
          getCapabilities: () => REVIEWER_CAPABILITIES,
          buildPrompt: buildReviewerPrompt,
          buildToolFormatReminder: (format) =>
            buildCodeToolFormatReminder(format as CodeToolFormat),
        },
      ],
      [
        'tester',
        {
          getCapabilities: () => TESTER_CAPABILITIES,
          buildPrompt: buildTesterPrompt,
          buildToolFormatReminder: (format) =>
            buildCodeToolFormatReminder(format as CodeToolFormat),
        },
      ],
    ]),
  },
};
