import type { ZenModule } from '@renderer/components/RightPanel/Zen/feature/Chat/services/moduleRegistry';
import { CODE_TAG_REGISTRY } from './constants/tag-registry';
import { CAPABILITIES as CODE_CAPABILITIES } from './prompts/code/config';
import { CAPABILITIES as ORCHESTRATOR_CAPABILITIES } from './prompts/multi-agent/orchestrator/config';
import { CAPABILITIES as PLANNER_CAPABILITIES } from './prompts/multi-agent/planner/config';
import { CAPABILITIES as EXECUTOR_CAPABILITIES } from './prompts/multi-agent/executor/config';
import { CAPABILITIES as REVIEWER_CAPABILITIES } from './prompts/multi-agent/reviewer/config';
import { CAPABILITIES as TESTER_CAPABILITIES } from './prompts/multi-agent/tester/config';
import type { ExecutorOptions } from '@renderer/components/RightPanel/Zen/feature/Chat/types/executor-types';
import { CommitMessageRenderer } from './renderers/CommitMessageRenderer';
import { DeleteFileRenderer } from './renderers/DeleteFileRenderer';
import { FindFilesRenderer } from './renderers/FindFilesRenderer';
import { GitDiffRenderer } from './renderers/GitDiffRenderer';
import { GitStatusRenderer } from './renderers/GitStatusRenderer';
import { GrepRenderer } from './renderers/GrepRenderer';
import { ListFilesRenderer } from './renderers/ListFilesRenderer';
import { ReadFileRenderer } from './renderers/ReadFileRenderer';
import { ReadMemoryRenderer } from './renderers/ReadMemoryRenderer';
import { ReadSkillRenderer } from './renderers/ReadSkillRenderer';
import ListAgentsRenderer from './renderers/ListAgentsRenderer';
import CreateAgentRenderer from './renderers/CreateAgentRenderer';
import SendMessageRenderer from './renderers/SendMessageRenderer';
import DeleteAgentRenderer from './renderers/DeleteAgentRenderer';
import { ReplaceInFileRenderer } from './renderers/ReplaceInFileRenderer';
import { RunCommandRenderer } from './renderers/RunCommandRenderer';
import { UpdateMemoryRenderer } from './renderers/UpdateMemoryRenderer';
import { WriteToFileRenderer } from './renderers/WriteToFileRenderer';
import { executeRunCommand, setRunCommandValidator } from './executors/RunCommandExecutor';
import { executeReadFile } from './executors/ReadFileExecutor';
import { executeWriteToFile } from './executors/WriteToFileExecutor';
import { executeReplaceInFile } from './executors/ReplaceInFileExecutor';
import { executeListFiles } from './executors/ListFilesExecutor';
import { executeFindFiles } from './executors/FindFilesExecutor';
import { SecurityValidator } from './utils/security';
import { executeDeleteFile } from './executors/DeleteFileExecutor';
import { executeGrep } from './executors/GrepExecutor';
import { executeGitDiff } from './executors/GitDiffExecutor';
import { executeMoveFile } from './executors/MoveFileExecutor';
import { executeReadMemory } from './executors/ReadMemoryExecutor';
import { executeUpdateMemory } from './executors/UpdateMemoryExecutor';
import { executeReadSkill } from './executors/ReadSkillExecutor';
import { executeListAgents } from './executors/ListAgentsExecutor';
import { executeCreateAgent } from './executors/CreateAgentExecutor';
import { executeSendMessage } from './executors/SendMessageExecutor';
import { executeDeleteAgent } from './executors/DeleteAgentExecutor';
import { executeGitStatus } from './executors/GitStatusExecutor';
import { executeCommitMessage } from './executors/CommitMessageExecutor';
import { parseReadFile } from './parsers/ReadFileParser';
import { parseWriteToFile } from './parsers/WriteToFileParser';
import { parseReplaceInFile } from './parsers/ReplaceInFileParser';
import { parseListFiles } from './parsers/ListFilesParser';
import { parseFindFiles } from './parsers/FindFilesParser';
import { parseGrep } from './parsers/GrepParser';
import { parseDeleteFile } from './parsers/DeleteFileParser';

import { parseRunCommand } from './parsers/RunCommandParser';
import { parseGitStatus } from './parsers/GitStatusParser';
import { parseGitDiff } from './parsers/GitDiffParser';
import { parseReadMemory } from './parsers/ReadMemoryParser';
import { parseUpdateMemory } from './parsers/UpdateMemoryParser';
import { parseReadSkill } from './parsers/ReadSkillParser';
import { parseListAgents } from './parsers/ListAgentsParser';
import { parseCreateAgent } from './parsers/CreateAgentParser';
import { parseSendMessage } from './parsers/SendMessageParser';
import { parseDeleteAgent } from './parsers/DeleteAgentParser';
import { executeListTasks } from './executors/ListTasksExecutor';
import { executeGetTask } from './executors/GetTaskExecutor';
import { executeCreateTask } from './executors/CreateTaskExecutor';
import { executeUpdateTask } from './executors/UpdateTaskExecutor';
import { executeAssignTask } from './executors/AssignTaskExecutor';
import { executeCreateWorkflow } from './executors/CreateWorkflowExecutor';
import { executeGetWorkflow } from './executors/GetWorkflowExecutor';
import { executeUpdateWorkflow } from './executors/UpdateWorkflowExecutor';
import { parseListTasks } from './parsers/ListTasksParser';
import { parseGetTask } from './parsers/GetTaskParser';
import { parseCreateTask } from './parsers/CreateTaskParser';
import { parseUpdateTask } from './parsers/UpdateTaskParser';
import { parseAssignTask } from './parsers/AssignTaskParser';
import { parseCreateWorkflow } from './parsers/CreateWorkflowParser';
import { parseGetWorkflow } from './parsers/GetWorkflowParser';
import { parseUpdateWorkflow } from './parsers/UpdateWorkflowParser';
import ListTasksRenderer from './renderers/ListTasksRenderer';
import GetTaskRenderer from './renderers/GetTaskRenderer';
import CreateTaskRenderer from './renderers/CreateTaskRenderer';
import UpdateTaskRenderer from './renderers/UpdateTaskRenderer';
import AssignTaskRenderer from './renderers/AssignTaskRenderer';
import CreateWorkflowRenderer from './renderers/CreateWorkflowRenderer';
import GetWorkflowRenderer from './renderers/GetWorkflowRenderer';
import UpdateWorkflowRenderer from './renderers/UpdateWorkflowRenderer';
import {
  buildPromptForMode as buildCodePrompt,
  buildToolFormatReminder as buildCodeToolFormatReminder,
  type ToolFormat as CodeToolFormat,
} from './prompts/code';
import { formatCodeAction, formatCodeCompletedTooltip } from './services/tool-display-formatters';
import { registerActionDisplayFormatter } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/action-display-formatter';
import { registerCompletedTooltipFormatter as registerTooltipFormatter } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/status-tooltip-builder';
import { registerToolStatusChecker } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/tool-status-registry';
import { checkCodeToolStatus } from './services/tool-status-checker';
import {
  checkCodeToolCollapse,
  checkCodeToolDanger,
  formatCodeToolForMarkdown,
} from './services/tool-behaviors';
import { transformCodeToolOutput } from './services/tool-output-transformer';
import {
  registerToolCollapseChecker,
  registerToolDangerChecker,
  registerToolMarkdownFormatter,
  registerToolOutputTransformer,
} from '@renderer/components/RightPanel/Zen/feature/Chat/utils/tool-behavior-registry';
import { registerToolOutputFormatter } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/tool-output-registry';
import { registerStreamingTool } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/tool-streaming-registry';
import {
  registerMutationChecker,
  registerFilePathExtractor,
  registerSingleLineReviewChecker,
  registerDiffCalculator,
  registerRawContentDiffExtractor,
} from '@renderer/components/RightPanel/Zen/feature/Chat/utils/tool-mutation-registry';
import { formatCodeToolOutput } from './services/tool-output-formatter';
import {
  checkCodeToolMutation,
  extractCodeFilePath,
  checkCodeSingleLineReview,
  calculateCodeDiff,
} from './services/tool-mutations';
import { extractCodeRawContentDiff } from './services/raw-content-diff';
import { buildOrchestratorPrompt } from './prompts/multi-agent/orchestrator';
import { buildPlannerPrompt } from './prompts/multi-agent/planner';
import { buildExecutorPrompt } from './prompts/multi-agent/executor';
import { buildReviewerPrompt } from './prompts/multi-agent/reviewer';
import { buildTesterPrompt } from './prompts/multi-agent/tester';

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
    git_diff: async (a) => {
      const filePath =
        typeof a.params === 'string' ? a.params : a.params?.path || a.params?.file_path || '';
      return executeGitDiff(filePath, (a as any).actionId || 'git-diff-' + Date.now());
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
