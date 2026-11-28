import type { ComponentType } from 'react';
import type { ToolExecutor } from './executor.types';
import type { ToolFormatId } from './tool_format.types';

export interface SystemPromptDescriptor {
  /** Get capabilities for this prompt */
  getCapabilities: () => ZenModuleCapabilities;
  /** Build the full system prompt */
  buildPrompt: (config: any) => string;
  /** Build tool format reminder for DSML fallback (optional) */
  buildToolFormatReminder?: (toolFormat: ToolFormatId) => string;
}

export interface ZenModulePrompts {
  /** Map of promptId -> descriptor. Main prompt uses module id as key (e.g. 'code', 'emulate', 'recon') */
  systemPrompts: Map<string, SystemPromptDescriptor>;
}

/**
 * Một tính năng có tập lựa chọn riêng cho từng system prompt.
 * - `options` ≥ 2 phần tử: UI hiện selector với đúng các lựa chọn này.
 * - `options` 1 phần tử: giá trị cố định, UI ẩn selector.
 */
export interface SelectableCapability {
  options: readonly string[];
  default: string;
}

/** Các feature riêng của từng system prompt. Bỏ trống hoặc false = tắt. */
export interface ZenFeatureFlags {
  /** generate-commit-message */
  commitMessage?: boolean;
}

export interface ZenModuleCapabilities {
  promptLength?: boolean | SelectableCapability;
  styleCode?: boolean | SelectableCapability;
  features?: ZenFeatureFlags;
  skill?: boolean;
  memory?: boolean;
  toolFormats?: ToolFormatId[];
  multiAgent?: boolean;
}

export interface ZenModule {
  id: string;
  tagRegistry?: Record<string, any>;
  executors: Record<string, ToolExecutor['execute']>;
  parsers?: Record<string, (inner: string) => Record<string, any>>;
  renderers?: Record<string, ComponentType<any>>;
  prompts?: ZenModulePrompts;
  capabilities?: ZenModuleCapabilities;
  services?: Record<string, any>;
  getConversationScope?: () => string | null;
}

export interface ResolvedSelectable {
  enabled: boolean;
  selectable: boolean;
  options: readonly string[];
  value: string;
}