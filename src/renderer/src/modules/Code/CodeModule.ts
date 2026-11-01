import type { ZenModule } from '@renderer/components/RightPanel/Zen/feature/Chat/services/moduleRegistry';
import { CODE_TAG_REGISTRY } from './constants/tag-registry';
import { CAPABILITIES as CODE_CAPABILITIES } from './prompts/code/config';
// import { CAPABILITIES as ORCHESTRATOR_CAPABILITIES } from './prompts/orchestrator/config';
// import { CAPABILITIES as PLANNER_CAPABILITIES } from './prompts/planner/config';
// import { CAPABILITIES as EXECUTOR_CAPABILITIES } from './prompts/executor/config';
// import { CAPABILITIES as REVIEWER_CAPABILITIES } from './prompts/reviewer/config';
// import { CAPABILITIES as TESTER_CAPABILITIES } from './prompts/tester/config';
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
import { executeRunCommand, setRunCommandValidator } from './handler/tool/RunCommandExecutor';
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
import { buildPromptForMode as buildCodePrompt } from './prompts/code';
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
// import { buildOrchestratorPrompt } from './prompts/orchestrator';
// import { buildPlannerPrompt } from './prompts/planner';
// import { buildExecutorPrompt } from './prompts/executor';
// import { buildReviewerPrompt } from './prompts/reviewer';
// import { buildTesterPrompt } from './prompts/tester';

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
  },
  prompts: {
    systemPrompts: new Map([
      [
        'code',
        {
          getCapabilities: () => CODE_CAPABILITIES,
          buildPrompt: (config: any) => buildCodePrompt(config, config.mode ?? 'balanced'),
        },
      ],
      // [
      //   'orchestrator',
      //   {
      //     getCapabilities: () => ORCHESTRATOR_CAPABILITIES,
      //     buildPrompt: buildOrchestratorPrompt,
      //   },
      // ],
      // [
      //   'planner',
      //   {
      //     getCapabilities: () => PLANNER_CAPABILITIES,
      //     buildPrompt: buildPlannerPrompt,
      //   },
      // ],
      // [
      //   'executor',
      //   {
      //     getCapabilities: () => EXECUTOR_CAPABILITIES,
      //     buildPrompt: buildExecutorPrompt,
      //   },
      // ],
      // [
      //   'reviewer',
      //   {
      //     getCapabilities: () => REVIEWER_CAPABILITIES,
      //     buildPrompt: buildReviewerPrompt,
      //   },
      // ],
      // [
      //   'tester',
      //   {
      //     getCapabilities: () => TESTER_CAPABILITIES,
      //     buildPrompt: buildTesterPrompt,
      //   },
      // ],
    ]),
  },
};
