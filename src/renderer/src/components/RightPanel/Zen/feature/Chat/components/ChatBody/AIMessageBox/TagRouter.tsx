import React, { useState, useEffect } from 'react';
/**
 * ------------------------------------------------------------------
 * TagRouter
 * ------------------------------------------------------------------
 * Router component điều hướng tool types → renderer components.
 * Xử lý tất cả các loại group (markdown, code, question, error, tools)
 * và render đúng component cho từng tool type.
 *
 * Main features:
 * - Xử lý error tool actions với ErrorBlock + ActionBar
 * - Render 28 standard tools qua allToolRenderers map
 * - Xử lý 7 tool phức tạp với logic riêng (write, replace, run_command...)
 * - Git diff và git status rendering
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import { $ } from '@renderer/utils/color';

// ── Constants ──
import {
  shouldShowFileStats,
  shouldValidateFuzzyMatch,
  isToolClickable,
  TOOL_ACTION_TYPES,
  EXECUTION_STATUS,
  type TerminalStatus,
  TAG_REGISTRY,
} from '../../../constants/tag-registry';

// ── Types ──
import { ToolAction } from '../../../services/ResponseParser';
import { Message } from '../../../types/message';
import { GroupType } from '../../../types/renderer-types';

// ── Utils ──
import { formatActionForDisplay } from '../../../services/ResponseParser';

// ── Components ──
import { getModuleRenderers, getModuleRenderer } from '../../../services/ModuleRegistry';
import { ErrorRenderer } from './renderers/ErrorRenderer';
import { MarkdownRenderer } from './renderers/MarkdownRenderer';
import { QuestionRenderer } from './renderers/QuestionRenderer';
import { WarningRenderer } from './renderers/WarningRenderer';
import ErrorBlock from './ErrorBlock';
import ActionBar from './ActionBar';
import { ThinkingBlock } from './ThinkingBlock';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';
import CodeBlock from '@renderer/components/common/CodeBlock';

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
  isViewOnly?: boolean;
  dangerousCommands?: Record<
    string,
    { actionId: string; commandText: string; folderPath?: string; reason: string }
  >;
  onProceedDangerousCommand?: (actionId: string) => void;
  onCancelDangerousCommand?: (actionId: string) => void;
  /** Feature/module hiện tại (code/recon/emulate/...) để chọn renderer đúng module khi trùng tool name. */
  feature?: string | null;
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
  isViewOnly = false,
  dangerousCommands,
  onProceedDangerousCommand,
  onCancelDangerousCommand,
  feature,
}) => {
  // conversation_title is a silent tool — it updates the title in the background
  // but doesn't render any UI. Skip early.
  if (
    group.type === 'tools' &&
    group.items.every((it) => it.action.type === 'conversation_title')
  ) {
    return null;
  }

  // Handle UI blocks
  if (group.type === 'markdown') {
    return <MarkdownRenderer content={group.content} knownFilePaths={knownFilePaths} />;
  }

  if (group.type === 'code') {
    return (
      <div className="pt-1 text-[13px] text-text-primary">
        <CodeBlock code={group.content} language={group.language} wordWrap="off" />
      </div>
    );
  }

  if (group.type === 'question') {
    const hasQuestions = group.questions && group.questions.length > 0;
    // Debug log - có thể xóa sau khi fix
    console.log('[DEBUG] TagRouter question disabled inputs', {
      hasNextUserMessage: !!nextUserMessage,
      isGenerating,
      isViewOnly,
    });
    return (
      <QuestionRenderer
        questions={hasQuestions ? group.questions : undefined}
        options={!hasQuestions ? group.options : undefined}
        title={group.title}
        optional={group.optional}
        selectedOption={group.selectedOption}
        questionAnswers={group.questionAnswers as unknown as Record<string, any>}
        disabled={!!nextUserMessage || isGenerating || isViewOnly}
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

  if (group.type === 'thinking') {
    return <ThinkingBlock content={group.content} isStreaming={isGenerating} />;
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
                      <div className="flex items-center gap-2 text-[13px] text-text-primary">
                        <span className="font-semibold opacity-80">{toolLabel}</span>
                        {fileName && (
                          <>
                            <span className="flex items-center">
                              <img
                                src={getFileIconPath(filePath)}
                                alt=""
                                style={{ width: '16px', height: '16px' }}
                              />
                            </span>
                            <span className="font-medium opacity-90 font-mono text-[12px]">
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
                          className="text-[11px] opacity-60 font-mono whitespace-nowrap overflow-hidden text-ellipsis w-full px-1 pl-5 rounded-sm"
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

  // Renderer của các module (Code/Emulate/Recon/...) lấy từ registry
  const allToolRenderers: Record<string, React.ComponentType<any>> = getModuleRenderers();

  // Ưu tiên renderer của module hiện tại để tránh module khác ghi đè khi trùng tool name.
  const ToolRenderer = getModuleRenderer(feature, toolType) ?? allToolRenderers[toolType];
  if (ToolRenderer) {
    return (
      <>
        {toolGroup.map(({ action, index }) => (
          <ToolRenderer
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
            isRejected={rejectedActions?.has(`${messageId}-action-${index}`)}
            rejectedActions={rejectedActions}
            mergedItems={toolGroup.length > 1 ? toolGroup : undefined}
            firstUnclickedActionIndex={firstUnclickedActionIndex}
            singleLineReviewActions={singleLineReviewActions}
            onConfirmSingleLineAction={onConfirmSingleLineAction}
            onRejectSingleLineAction={onRejectSingleLineAction}
            moduleId={feature ?? null}
            terminalStatus={terminalStatus}
            nextUserMessage={nextUserMessage}
            dangerousCommand={dangerousCommands?.[`${messageId}-action-${index}`]}
            onProceedDangerousCommand={onProceedDangerousCommand}
            onCancelDangerousCommand={onCancelDangerousCommand}
            gitStatusItems={gitStatusItems}
            branch={gitStatusBranch}
            isProcessing={isGitProcessing || executionState?.status === 'running'}
            isVisible={isGitStatusVisible}
            onConfirm={onGitConfirm}
            onCancel={onGitCancel}
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
            <span className="text-[13px] text-text-primary font-semibold flex-1">
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
