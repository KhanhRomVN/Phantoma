import React, { useState, useEffect } from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { $ } from '@renderer/utils/color';

// Hooks
import { useProject } from '../../../../../context/ProjectContext';

// Services
import { extensionService } from '../../../../../services/ExtensionService';

// Constants
import {
  shouldShowFileStats,
  shouldValidateFuzzyMatch,
  isToolClickable,
  TOOL_ACTION_TYPES,
  EXECUTION_STATUS,
  type TerminalStatus,
  TAG_REGISTRY,
} from '../../../constants/constants';

// Types
import { ToolAction } from '../../../services/ResponseParser';
import { Message } from '../../../types/message';
import { GroupType } from '../../../types/renderer-types';

// UtilsS
import { formatActionForDisplay } from '../../../services/ResponseParser';

// Components
import {
  CommitMessageRenderer,
  DeleteFileRenderer,
  ErrorRenderer,
  WriteToFileRenderer,
  ReplaceInFileRenderer,
  ReadFileRenderer,
  ListFilesRenderer,
  FindFilesRenderer,
  GrepRenderer,
  RevertFileRenderer,
  ViewReplaceHistoryRenderer,
  RunCommandRenderer,
  GitStatusRenderer,
  MarkdownRenderer,
  QuestionRenderer,
  WarningRenderer,
  ListHttpsRenderer,
  ListHostsRenderer,
  ListSourcesRenderer,
  GetSourceDetailRenderer,
  GetHttpsDetailRenderer,
  ApplyFilterRenderer,
} from './renderers';
import ErrorBlock from './blocks/other/ErrorBlock';
import ActionBar from './ActionBar';
import FileIcon from '@renderer/components/common/FileIcon';
import GitDiffBlock from './blocks/code/GitDiffBlock';
import { CodeBlock } from '@renderer/components/common/CodeBlock';

interface TagRouterProps {
  group: GroupType;
  messageId: string;
  clickedActions: Set<string>;
  rejectedActions?: Set<string>;
  onToolClick: (
    action: ToolAction,
    messageId: string,
    actionIndex: number,
    type: (typeof TOOL_ACTION_TYPES)[keyof typeof TOOL_ACTION_TYPES],
  ) => void;
  executionState?: {
    total: number;
    completed: number;
    status: (typeof EXECUTION_STATUS)[keyof typeof EXECUTION_STATUS];
  };
  isActiveGroup?: boolean;
  failedActions?: Set<string>;
  isLastMessage?: boolean;
  isRestored?: boolean;
  isLastGroup?: boolean;
  toolOutputs?: Record<string, { output: string; isError: boolean; terminalId?: string }>;
  terminalStatus?: Record<string, TerminalStatus>;
  nextUserMessage?: Message;
  allMessages?: Message[];
  allActions?: ToolAction[];
  conversationId?: string;
  singleLineReviewActions?: Record<string, { action: any; actionId: string; messageId: string }>;
  onConfirmSingleLineAction?: (actionId: string) => void;
  onRejectSingleLineAction?: (actionId: string) => void;
  onGitConfirm?: (statusItems: any[]) => void;
  onGitCancel?: () => void;
  gitStatusItems?: any[];
  gitStatusBranch?: string;
  isGitProcessing?: boolean;
  isGitStatusVisible?: boolean;
  onBackToHome?: (summary: string) => void;
  knownFilePaths?: Map<string, string>;
  isGenerating?: boolean;
  onSelectOption?: (messageId: string, option: string) => void;
  onSendMessage?: (
    content: string,
    files?: any[],
    model?: any,
    account?: any,
    skipLogic?: boolean,
    actionIds?: string[],
    uiHidden?: boolean,
  ) => void;
  isBlockedByPrecedingInteraction?: boolean;
  firstUnclickedActionIndex?: number;
}

const TagRouterInternal: React.FC<TagRouterProps> = ({
  group,
  messageId,
  clickedActions,
  rejectedActions,
  onToolClick,
  executionState,
  isActiveGroup,
  isLastMessage,
  isLastGroup = true,
  toolOutputs,
  terminalStatus,
  nextUserMessage,
  allMessages,
  conversationId,
  singleLineReviewActions,
  onConfirmSingleLineAction,
  onRejectSingleLineAction,
  onGitConfirm,
  onGitCancel,
  gitStatusItems,
  gitStatusBranch,
  isGitProcessing,
  isGitStatusVisible = true,
  knownFilePaths,
  isGenerating,
  onSelectOption,
  onSendMessage,
  firstUnclickedActionIndex,
}) => {
  const { rootPath } = useProject();

  // Handle UI blocks
  if (group.type === 'markdown') {
    return <MarkdownRenderer content={group.content} knownFilePaths={knownFilePaths} />;
  }

  if (group.type === 'code') {
    return (
      <div className="pt-1 text-xs text-text-primary">
        <CodeBlock code={group.content} language={group.language} wordWrap="off" />
      </div>
    );
  }

  if (group.type === 'question') {
    const hasQuestions = group.questions && group.questions.length > 0;
    return (
      <QuestionRenderer
        questions={hasQuestions ? group.questions : undefined}
        options={!hasQuestions ? group.options : undefined}
        title={group.title}
        optional={group.optional}
        selectedOption={group.selectedOption}
        questionAnswers={group.questionAnswers as unknown as Record<string, any>}
        disabled={!!nextUserMessage || isGenerating}
        onAnswer={(questionId, value) => {
          if (!hasQuestions) return;
          if (onSelectOption) {
            onSelectOption(messageId, JSON.stringify({ questionId, value }));
          }
        }}
        onAllAnswered={(answers) => {
          if (!hasQuestions) return;
          if (onSelectOption) {
            onSelectOption(
              messageId,
              JSON.stringify({
                allAnswered: true,
                answers,
                questions: group.questions || [],
              }),
            );
          }
        }}
        onOptionSelect={(option: string) => {
          if (hasQuestions) return;
          if (onSelectOption) {
            onSelectOption(messageId, option);
          }
          if (onSendMessage) {
            onSendMessage(
              `[question: "${group.title || 'Question'}"] Answer: ${option}`,
              undefined,
              undefined,
              undefined,
              true,
            );
          }
        }}
      />
    );
  }

  if (group.type === 'error') {
    return (
      <ErrorRenderer
        content={group.content}
        errorCode={group.errorCode}
        toolName={group.toolName}
        isLast={isLastGroup}
        isLastMessage={isLastMessage}
        maxHeight="300px"
      />
    );
  }

  if (group.type === 'warning') {
    return (
      <WarningRenderer
        label={group.label}
        message={group.message}
        warningColor={$('--warn')}
        isPulsing={false}
      />
    );
  }

  // Handle tools group
  if (group.type !== 'tools') {
    return null;
  }

  const toolGroup = group.items;

  const [, setFuzzyStatus] = React.useState<{
    status: string;
    score?: number;
    startLine?: number;
  } | null>(null);
  const [fileStatsMap, setFileStatsMap] = React.useState<
    Record<string, { lines: number; loading: boolean }>
  >({});
  const [storedOutput, setStoredOutput] = useState<string | null>(null);
  const [, setCollapsedActions] = useState<Set<string>>(new Set());
  const processedActions = React.useRef<Set<string>>(new Set());

  const effectCollapsedCountRef = React.useRef(0);
  useEffect(() => {
    effectCollapsedCountRef.current += 1;
    const initialCollapsed = new Set<string>();
    toolGroup.forEach((_item, index) => {
      const actionId = `${messageId}-action-${index}`;
      if (_item.action.type !== 'run_command') {
        initialCollapsed.add(actionId);
      }
    });
    setCollapsedActions(initialCollapsed);
  }, [toolGroup, messageId]);

  // Fetch terminal output from history
  const runCommandAction = toolGroup.find((g) => g.action.type === 'run_command');
  useEffect(() => {
    if (!nextUserMessage?.content || !runCommandAction) return;
    const commandText = runCommandAction.action.params.command;
    if (!commandText) return;

    const escaped = commandText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(
      `Output: \\[run_command for '${escaped}'.*?\\] .*?with "terminal_output-([a-f0-9-]+)"`,
    ).exec(nextUserMessage.content);

    if (match?.[1]) {
      const outputUuid = match[1];
      const requestId = `read-terminal-${outputUuid}`;
      if (processedActions.current.has(requestId) || storedOutput) return;

      const handleMessage = (event: MessageEvent) => {
        const msg = event.data;
        if (msg.command === 'readTerminalOutputResult' && msg.outputUuid === outputUuid) {
          if (msg.content) setStoredOutput(msg.content);
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
      processedActions.current.add(requestId);
      extensionService.postMessage({
        command: 'readTerminalOutput',
        chatUuid: conversationId || nextUserMessage.conversationId || '',
        outputUuid,
        requestId,
      });
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [nextUserMessage?.id, runCommandAction?.action.params.command, messageId, storedOutput]);

  // Validate fuzzy match & fetch file stats
  React.useEffect(() => {
    const cleanups: (() => void)[] = [];

    toolGroup.forEach((item) => {
      const { action, index } = item;

      if (shouldValidateFuzzyMatch(action.type) && action.params.diff) {
        const validationId = `${messageId}-${index}-validate`;
        if (processedActions.current.has(validationId)) return;

        const handleMessage = (event: MessageEvent) => {
          const msg = event.data;
          if (msg.command === 'validateFuzzyMatchResult' && msg.id === validationId) {
            setFuzzyStatus({
              status: msg.status,
              score: msg.score,
              startLine: msg.startLine,
            });
            window.removeEventListener('message', handleMessage);
          }
        };
        window.addEventListener('message', handleMessage);
        cleanups.push(() => window.removeEventListener('message', handleMessage));
        processedActions.current.add(validationId);
        (window as any).vscodeApi?.postMessage({
          command: 'validateFuzzyMatch',
          path: action.params.path,
          diff: action.params.diff,
          id: validationId,
        });
      }

      if (shouldShowFileStats(action.type) && (action.params.path || action.params.file_path)) {
        const path = action.params.path || action.params.file_path;
        if (fileStatsMap[path]) return;
        const statId = `${messageId}-${index}-stats`;
        if (processedActions.current.has(statId)) return;
        processedActions.current.add(statId);

        const handleStats = (event: MessageEvent) => {
          const msg = event.data;
          if (msg.command === 'fileStatsResult' && msg.id === statId && msg.path === path) {
            setFileStatsMap((prev) => ({
              ...prev,
              [path]: { lines: msg.lines, loading: false },
            }));
            window.removeEventListener('message', handleStats);
          }
        };
        window.addEventListener('message', handleStats);
        cleanups.push(() => window.removeEventListener('message', handleStats));
        (window as any).vscodeApi?.postMessage({
          command: 'getFileStats',
          path,
          id: statId,
        });
      }
    });

    return () => cleanups.forEach((c) => c());
  }, [toolGroup, messageId, isActiveGroup, clickedActions, onToolClick, fileStatsMap]);

  if (!toolGroup || toolGroup.length === 0) return null;

  const firstAction = toolGroup[0].action;
  const toolType = firstAction.type;
  const isLastItemInList = isLastGroup;

  // Handle malformed/error tool actions
  if (firstAction.isError) {
    const errorColor = $('--error');

    const toolLabel = TAG_REGISTRY[toolType]?.title ?? toolType.toUpperCase().replace(/_/g, ' ');

    const filePath =
      firstAction.params.file_path ||
      firstAction.params.folder_path ||
      firstAction.params.path ||
      '';
    const fileName = filePath ? filePath.split('/').pop() || filePath : '';

    return (
      <div className={cn('relative flex flex-col gap-1.5', isLastItemInList ? 'mb-0' : 'mb-2')}>
        <div className="pt-1 flex items-start justify-between w-full">
          <div className="flex-1 min-w-0">
            <div>
              <div className="mt-px flex flex-col gap-0.5 flex-1 min-w-0 w-full">
                <div className="flex items-start gap-2 flex-nowrap">
                  {/* Status dot */}
                  <div
                    className="relative w-4 h-4 shrink-0 flex items-center justify-center mt-0.5"
                    title="Error - Action failed"
                  >
                    <div
                      className="absolute w-4 h-4 rounded-full opacity-40"
                      style={{ border: `2px solid ${errorColor}` }}
                    />
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: errorColor }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5 mt-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-2 text-xs text-text-primary">
                        <span className="font-semibold opacity-80">{toolLabel}</span>
                        {fileName && (
                          <>
                            <span className="flex items-center">
                              <FileIcon path={filePath} style={{ width: '16px', height: '16px' }} />
                            </span>
                            <span className="font-medium opacity-90 font-mono text-[11px]">
                              {fileName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {filePath && (
                      <div className="flex justify-end items-center pr-1 pt-1 mt-0.5 relative w-full max-w-full overflow-hidden">
                        <div
                          className="absolute left-0 top-0 w-4 h-3"
                          style={{
                            borderLeft: `1px solid color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`,
                            borderBottom: `1px solid color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`,
                          }}
                        />
                        <span
                          className="text-[10px] opacity-60 font-mono whitespace-nowrap overflow-hidden text-ellipsis w-full px-1 pl-5 rounded-sm"
                          style={{ color: $('--text-secondary') }}
                          title={filePath}
                        >
                          {filePath}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ErrorBlock
          content={firstAction.errorMessage || 'Unknown error occurred'}
          errorCode={firstAction.errorCode}
          showHeader={false}
          maxHeight="300px"
        />

        {!nextUserMessage && (
          <ActionBar
            action={firstAction}
            messageId={messageId}
            actionIndex={toolGroup[0].index}
            hasError={true}
            onAction={(_e, type) => {
              onToolClick(firstAction, messageId, toolGroup[0].index, type);
            }}
          />
        )}
      </div>
    );
  }

  // Handle view_replace_history
  if (toolType === 'view_replace_history') {
    const action = firstAction;
    const actionIndex = toolGroup[0].index;
    return (
      <ViewReplaceHistoryRenderer
        action={action}
        actionIndex={actionIndex}
        messageId={messageId}
        isActionClicked={clickedActions.has(`${messageId}-action-${actionIndex}`)}
        isLastItemInList={isLastItemInList}
        toolOutputs={toolOutputs}
        fileStatsMap={fileStatsMap}
        onToolClick={onToolClick}
      />
    );
  }

  if (toolType === 'write_to_file') {
    return (
      <>
        {toolGroup.map(({ action, index }) => {
          const isClicked = clickedActions.has(`${messageId}-action-${index}`);
          const isFirstInGroup = index === toolGroup[0].index;
          const isActive = isActiveGroup && isFirstInGroup;

          if (
            firstUnclickedActionIndex !== undefined &&
            index > firstUnclickedActionIndex &&
            !isClicked
          ) {
            return null;
          }

          return (
            <WriteToFileRenderer
              key={index}
              action={action}
              actionIndex={index}
              messageId={messageId}
              isActionClicked={isClicked}
              isActiveGroup={isActive}
              isLastMessage={isLastMessage}
              isLastItemInList={isLastItemInList && index === toolGroup[toolGroup.length - 1].index}
              toolOutputs={toolOutputs}
              allMessages={allMessages}
              fileStatsMap={fileStatsMap}
              onToolClick={onToolClick}
              conversationId={conversationId}
              singleLineReviewActions={singleLineReviewActions}
              onConfirmSingleLineAction={onConfirmSingleLineAction}
              onRejectSingleLineAction={onRejectSingleLineAction}
            />
          );
        })}
      </>
    );
  }

  if (toolType === 'replace_in_file') {
    return (
      <>
        {toolGroup.map(({ action, index }) => {
          const isClicked = clickedActions.has(`${messageId}-action-${index}`);
          const isFirstInGroup = index === toolGroup[0].index;
          const isActive = isActiveGroup && isFirstInGroup;

          const willHide =
            firstUnclickedActionIndex !== undefined &&
            index > firstUnclickedActionIndex &&
            !isClicked;

          if (willHide) {
            return null;
          }

          return (
            <ReplaceInFileRenderer
              key={index}
              action={action}
              actionIndex={index}
              messageId={messageId}
              isActionClicked={isClicked}
              isActiveGroup={isActive}
              isLastMessage={isLastMessage}
              isLastItemInList={isLastItemInList && index === toolGroup[toolGroup.length - 1].index}
              toolOutputs={toolOutputs}
              allMessages={allMessages}
              fileStatsMap={fileStatsMap}
              onToolClick={onToolClick}
              conversationId={conversationId}
              mergedItems={toolGroup.length > 1 ? toolGroup : undefined}
              rejectedActions={rejectedActions}
            />
          );
        })}
      </>
    );
  }

  if (toolType === 'run_command') {
    return (
      <RunCommandRenderer
        action={firstAction}
        actionIndex={toolGroup[0].index}
        messageId={messageId}
        isActionClicked={clickedActions.has(`${messageId}-action-${toolGroup[0].index}`)}
        isRejected={rejectedActions?.has(`${messageId}-action-${toolGroup[0].index}`)}
        isActiveGroup={isActiveGroup}
        isLastMessage={isLastMessage}
        toolOutputs={toolOutputs}
        terminalStatus={terminalStatus}
        nextUserMessage={nextUserMessage}
        rootPath={rootPath}
        onToolClick={onToolClick}
        storedOutput={storedOutput}
      />
    );
  }

  if (toolType === 'git_status') {
    let finalGitStatusItems = gitStatusItems;
    if (!finalGitStatusItems || finalGitStatusItems.length === 0) {
      let itemsFromParams = firstAction.params?.items || [];
      if (typeof itemsFromParams === 'string') {
        try {
          itemsFromParams = JSON.parse(itemsFromParams);
        } catch (e) {
          itemsFromParams = [];
        }
      }
      finalGitStatusItems = itemsFromParams;
    }
    return (
      <GitStatusRenderer
        action={firstAction}
        actionIndex={toolGroup[0].index}
        messageId={messageId}
        isActionClicked={clickedActions.has(`${messageId}-action-${toolGroup[0].index}`)}
        isActiveGroup={isActiveGroup}
        isLastMessage={isLastMessage}
        isLastItemInList={isLastItemInList}
        toolOutputs={toolOutputs}
        onToolClick={onToolClick}
        gitStatusItems={finalGitStatusItems}
        branch={gitStatusBranch}
        isProcessing={isGitProcessing || executionState?.status === 'running'}
        onConfirm={onGitConfirm}
        onCancel={onGitCancel}
        isVisible={isGitStatusVisible}
      />
    );
  }

  if (toolType === 'commit_message') {
    const action = firstAction;
    const actionIndex = toolGroup[0].index;
    const actionId = `${messageId}-action-${actionIndex}`;
    const isRejected = rejectedActions?.has(actionId) || false;

    return (
      <CommitMessageRenderer
        action={action}
        actionIndex={actionIndex}
        messageId={messageId}
        isActionClicked={clickedActions.has(actionId)}
        isRejected={isRejected}
        isLastItemInList={isLastItemInList}
        onToolClick={onToolClick}
        branch={gitStatusBranch}
      />
    );
  }

  if (toolType === 'list_https') {
    return (
      <ListHttpsRenderer
        action={firstAction}
        actionIndex={toolGroup[0].index}
        messageId={messageId}
        isActionClicked={clickedActions.has(`${messageId}-action-${toolGroup[0].index}`)}
        isActiveGroup={isActiveGroup}
        isLastMessage={isLastMessage}
        isLastItemInList={isLastItemInList}
        toolOutputs={toolOutputs}
        fileStatsMap={fileStatsMap}
        allMessages={allMessages}
        onToolClick={onToolClick}
        conversationId={conversationId}
      />
    );
  }

  if (toolType === 'list_hosts') {
    return (
      <ListHostsRenderer
        action={firstAction}
        actionIndex={toolGroup[0].index}
        messageId={messageId}
        isActionClicked={clickedActions.has(`${messageId}-action-${toolGroup[0].index}`)}
        isActiveGroup={isActiveGroup}
        isLastMessage={isLastMessage}
        isLastItemInList={isLastItemInList}
        toolOutputs={toolOutputs}
        fileStatsMap={fileStatsMap}
        allMessages={allMessages}
        onToolClick={onToolClick}
        conversationId={conversationId}
      />
    );
  }

  if (toolType === 'list_sources') {
    return (
      <ListSourcesRenderer
        action={firstAction}
        actionIndex={toolGroup[0].index}
        messageId={messageId}
        isActionClicked={clickedActions.has(`${messageId}-action-${toolGroup[0].index}`)}
        isActiveGroup={isActiveGroup}
        isLastMessage={isLastMessage}
        isLastItemInList={isLastItemInList}
        toolOutputs={toolOutputs}
        fileStatsMap={fileStatsMap}
        allMessages={allMessages}
        onToolClick={onToolClick}
        conversationId={conversationId}
      />
    );
  }

  if (toolType === 'get_source_detail') {
    return (
      <GetSourceDetailRenderer
        action={firstAction}
        actionIndex={toolGroup[0].index}
        messageId={messageId}
        isActionClicked={clickedActions.has(`${messageId}-action-${toolGroup[0].index}`)}
        isActiveGroup={isActiveGroup}
        isLastMessage={isLastMessage}
        isLastItemInList={isLastItemInList}
        toolOutputs={toolOutputs}
        fileStatsMap={fileStatsMap}
        allMessages={allMessages}
        onToolClick={onToolClick}
        conversationId={conversationId}
      />
    );
  }

  if (toolType === 'get_https_detail') {
    return (
      <GetHttpsDetailRenderer
        action={firstAction}
        actionIndex={toolGroup[0].index}
        messageId={messageId}
        isActionClicked={clickedActions.has(messageId + '-action-' + toolGroup[0].index)}
        isActiveGroup={isActiveGroup}
        isLastMessage={isLastMessage}
        isLastItemInList={isLastItemInList}
        toolOutputs={toolOutputs}
        fileStatsMap={fileStatsMap}
        allMessages={allMessages}
        onToolClick={onToolClick}
        conversationId={conversationId}
      />
    );
  }

  if (toolType === 'apply_filter') {
    const actionId1 = messageId + '-action-' + toolGroup[0].index;
    return (
      <ApplyFilterRenderer
        action={firstAction}
        actionIndex={toolGroup[0].index}
        messageId={messageId}
        isActionClicked={clickedActions.has(actionId1)}
        isActiveGroup={isActiveGroup}
        isLastMessage={isLastMessage}
        isLastItemInList={isLastItemInList}
        toolOutputs={toolOutputs}
        fileStatsMap={fileStatsMap}
        allMessages={allMessages}
        onToolClick={onToolClick}
        conversationId={conversationId}
      />
    );
  }

  if (toolType === 'git_diff') {
    const filePath = firstAction.params.file_path || '';
    const actionIndex = toolGroup[0].index;
    const actionId = `${messageId}-action-${actionIndex}`;

    const outputData = toolOutputs?.[actionId];
    const diffContent = outputData?.output || firstAction.params.diff || '';
    const hasOutput = !!outputData && !outputData.isError;

    const hasTriggeredExecution = React.useRef(false);
    React.useEffect(() => {
      if (!hasTriggeredExecution.current && !hasOutput && isActiveGroup && !isLastMessage) {
        hasTriggeredExecution.current = true;
        onToolClick(firstAction, messageId, actionIndex, 'accept');
      }
    }, [hasOutput, isActiveGroup, isLastMessage, actionId]);

    const parseDiffStats = (content: string) => {
      let added = 0;
      let deleted = 0;
      if (!content) return { added: 0, deleted: 0 };
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) added++;
        if (line.startsWith('-') && !line.startsWith('---')) deleted++;
      }
      return { added, deleted };
    };

    const stats = parseDiffStats(diffContent);

    if (!hasOutput && !isActiveGroup) {
      return (
        <div className="relative flex flex-col gap-1.5">
          <GitDiffBlock
            filePath={filePath}
            diffContent=""
            added={0}
            deleted={0}
            statusColor={$('--success')}
            isPartial={true}
            branch={gitStatusBranch}
            onFileClick={(path: any) => {
              const vscodeApi = (window as any).vscodeApi;
              if (vscodeApi) {
                vscodeApi.postMessage({
                  command: 'openFile',
                  path,
                });
              }
            }}
          />
        </div>
      );
    }

    return (
      <div className="relative flex flex-col gap-1.5">
        <GitDiffBlock
          filePath={filePath}
          diffContent={diffContent}
          added={stats.added}
          deleted={stats.deleted}
          statusColor={$('--success')}
          isPartial={!hasOutput && isActiveGroup}
          branch={gitStatusBranch}
          onFileClick={(path: any) => {
            const vscodeApi = (window as any).vscodeApi;
            if (vscodeApi) {
              vscodeApi.postMessage({
                command: 'openFile',
                path,
              });
            }
          }}
        />
      </div>
    );
  }

  // Handle read_file, list_files, find_files, grep, delete_file, revert_file
  const fileToolRenderers: Record<string, React.FC<any>> = {
    read_file: ReadFileRenderer,
    list_files: ListFilesRenderer,
    find_files: FindFilesRenderer,
    grep: GrepRenderer,
    delete_file: DeleteFileRenderer,
    revert_file: RevertFileRenderer,
  };

  const FileRenderer = fileToolRenderers[toolType];
  if (FileRenderer) {
    return (
      <>
        {toolGroup.map(({ action, index }) => (
          <FileRenderer
            key={index}
            action={action}
            actionIndex={index}
            messageId={messageId}
            isActionClicked={clickedActions.has(`${messageId}-action-${index}`)}
            isActiveGroup={isActiveGroup && index === toolGroup[0].index}
            isLastMessage={isLastMessage}
            isLastItemInList={isLastItemInList && index === toolGroup[toolGroup.length - 1].index}
            toolOutputs={toolOutputs}
            allMessages={allMessages}
            fileStatsMap={fileStatsMap}
            onToolClick={onToolClick}
            conversationId={conversationId}
          />
        ))}
      </>
    );
  }

  // Fallback for non-styled tools
  return (
    <>
      {toolGroup.map(({ action, index }) => (
        <div key={index} className="mb-2">
          <div
            className={cn(
              'py-2 px-4 bg-card-background rounded-lg flex items-center gap-2 w-fit transition-all duration-200',
              isToolClickable(action.type) ? 'cursor-pointer' : 'cursor-default',
            )}
            style={{ border: `2px solid ${$('--text-secondary')}` }}
            onClick={() => {
              if (isToolClickable(action.type)) onToolClick(action, messageId, index, 'accept');
            }}
          >
            <span className="text-xs text-text-primary font-semibold flex-1">
              {formatActionForDisplay(action)}
            </span>
            {isToolClickable(action.type) && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={$('--text-secondary')}
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </div>
        </div>
      ))}
    </>
  );
};

export default TagRouterInternal;
