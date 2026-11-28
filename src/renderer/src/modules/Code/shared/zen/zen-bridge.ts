/**
 * ------------------------------------------------------------------
 * Zen Bridge
 * ------------------------------------------------------------------
 * Điểm re-export duy nhất từ Widgets/Zen sang Code module: component,
 * context, registry, formatter, type và tiện ích. Code module chỉ import
 * Zen thông qua file này để tránh phụ thuộc trực tiếp vào đường dẫn nội bộ.
 *
 * Main exports:
 * - Components   : AgentPanel, AccountPanel, SkillPanel, TagHeader, ErrorBlock, MarkdownRenderer...
 * - Contexts     : AgentRootContext, SettingsProvider, WorkflowAgentContext, MultiAgentContext...
 * - Registries   : registerTool* / registerDiffCalculator / registerActionDisplayFormatter...
 * - Types        : ZenModule, ExecutorContext, TagDefinition, ToolAction và các checker/formatter type
 * - Utils        : extractParamValue, getNextUserMessage, getToolLabel, DISPLAY_ONLY_RESULT
 * ------------------------------------------------------------------
 */

// ─── Exports ─────────────────────────────────────────────────────────────────
export { AgentPanel } from '@renderer/components/Widgets/Zen';
export { default as AccountPanel } from '@renderer/components/Widgets/Zen/features/account';
export { SkillPanel } from '@renderer/components/Widgets/Zen/features/marketplace/components/SkillPanel';

export {
  AgentRootContext,
  useAgentRoot,
} from '@renderer/components/Widgets/Zen/context/AgentRootContext';
export {
  SettingsProvider,
  useSettings,
} from '@renderer/components/Widgets/Zen/context/SettingsContext';
export { useAgentFeature } from '@renderer/components/Widgets/Zen/context/FeatureContext';
export { MultiAgentContext } from '@renderer/components/Widgets/Zen/context/MultiAgentContext';
export type { MultiAgentControl } from '@renderer/components/Widgets/Zen/context/MultiAgentContext';
export {
  AccountAgentsContext,
  WorkflowAgentContext,
  parseAgentMessage,
  useWorkflowAgentSync,
} from '@renderer/components/Widgets/Zen/context/WorkflowAgentContext';
export type { WorkflowAgentSync } from '@renderer/components/Widgets/Zen/context/WorkflowAgentContext';

export { TagHeader } from '@renderer/components/Widgets/Zen/features/chat/components/chatbody/aimessagebox/TagHeader';
export { default as ErrorBlock } from '@renderer/components/Widgets/Zen/features/chat/components/chatbody/aimessagebox/ErrorBlock';
export { default as ActionBar } from '@renderer/components/Widgets/Zen/features/chat/components/chatbody/aimessagebox/ActionBar';
export { MarkdownRenderer } from '@renderer/components/Widgets/Zen/features/chat/components/chatbody/aimessagebox/renderers/MarkdownRenderer';
export { default as UserMessageBox } from '@renderer/components/Widgets/Zen/features/chat/components/chatbody/UserMessageBox';
export { default as SelectModelAccountModal } from '@renderer/components/Widgets/Zen/features/composer/components/ModelAccountPickerModal';
export { splitModelAndEffort } from '@renderer/components/Widgets/Zen/features/composer/components/EffortDropdown';
export {
  accountsKey,
  cacheGet,
  cacheSet,
  providersKey,
} from '@renderer/components/Widgets/Zen/features/composer/stores/provider-model-cache.store';
export {
  MENTION_DRAG_TYPE,
  readDraggedItems,
  ZEN_MENTION_DROP_EVENT,
} from '@renderer/components/Widgets/Zen/features/composer/utils/mention-editor.utils';

export type {
  ZenModule,
  ZenModuleCapabilities,
} from '@renderer/components/Widgets/Zen/features/chat/types/zen_module.types';
export type {
  ExecutorContext,
  ExecutorOptions,
} from '@renderer/components/Widgets/Zen/features/chat/types/executor.types';
export type { TagDefinition } from '@renderer/components/Widgets/Zen/features/chat/types/tag.types';
export type {
  BaseRendererProps,
  MergedRendererProps,
} from '@renderer/components/Widgets/Zen/features/chat/types/renderer.types';
export type { ToolAction } from '@renderer/components/Widgets/Zen/features/chat/types/tool_action.types';

export { getToolLabel } from '@renderer/components/Widgets/Zen/features/chat/registries/tag.registry';
export {
  registerToolCollapseChecker,
  registerToolDangerChecker,
  registerToolMarkdownFormatter,
  registerToolOutputTransformer,
} from '@renderer/components/Widgets/Zen/features/chat/registries/tool_behavior.registry';
export { registerToolStatusChecker } from '@renderer/components/Widgets/Zen/features/chat/registries/tool_status.registry';
export { registerToolOutputFormatter } from '@renderer/components/Widgets/Zen/features/chat/registries/tool_output.registry';
export {
  registerDiffCalculator,
  registerFilePathExtractor,
  registerMutationChecker,
  registerRawContentDiffExtractor,
  registerSingleLineReviewChecker,
} from '@renderer/components/Widgets/Zen/features/chat/registries/tool_mutation.registry';
export { registerStreamingTool } from '@renderer/components/Widgets/Zen/features/chat/registries/tool_streaming.registry';
export { registerActionDisplayFormatter } from '@renderer/components/Widgets/Zen/features/chat/formatters/action_display.formatter';
export { registerCompletedTooltipFormatter } from '@renderer/components/Widgets/Zen/features/chat/formatters/status_tooltip.formatter';
export { DISPLAY_ONLY_RESULT } from '@renderer/components/Widgets/Zen/features/chat/constants/tool_execution';
export { extractParamValue } from '@renderer/components/Widgets/Zen/features/chat/utils/toolParser';
export { getNextUserMessage } from '@renderer/components/Widgets/Zen/features/chat/utils/message_navigator';

export { electronWidgetBridge } from '@renderer/components/Widgets/Zen/shared/platform/electron-widget-bridge.service';
import './code-bridge-handlers';
export { ZEN_INSERT_TEXT_EVENT } from '@renderer/components/Widgets/Zen/shared/constants/events';
export {
  TERMINAL_STATUS,
  TOOL_ACTION_TYPES,
} from '@renderer/components/Widgets/Zen/shared/types/tool-constants';
export type { TerminalStatus } from '@renderer/components/Widgets/Zen/shared/types/tool-constants';
export type { Message } from '@renderer/components/Widgets/Zen/shared/types';
export type {
  DiffCalculator,
  FilePathExtractor,
  RawContentDiffExtractor,
  SingleLineReviewChecker,
  ToolMutationChecker,
} from '@renderer/components/Widgets/Zen/features/chat/types/tool-mutation';
export type {
  ToolCollapseChecker,
  ToolDangerChecker,
  ToolMarkdownFormatter,
  ToolOutputTransformer,
} from '@renderer/components/Widgets/Zen/features/chat/types/tool-behaviors';
export type {
  ActionDisplayFormatter,
  CompletedTooltipFormatter,
} from '@renderer/components/Widgets/Zen/features/chat/types/tool-display';
export type { ToolOutputFormatter } from '@renderer/components/Widgets/Zen/features/chat/types/tool-output';
export type { ToolStatusChecker } from '@renderer/components/Widgets/Zen/features/chat/types/tool-status';
