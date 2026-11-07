/**
 * ------------------------------------------------------------------
 * Zen Module Registry
 * ------------------------------------------------------------------
 * Mỗi module (Code/Emulate/Recon/Design...) tự khai báo những gì nó
 * đóng góp cho Zen qua một ZenModule, Zen chỉ tra cứu qua registry.
 *
 * Main functions:
 * - registerZenModule()   : Đăng ký thêm module lúc runtime
 * - getZenModule()        : Lấy module theo id
 * - getZenModules()       : Danh sách module đã đăng ký
 * - getModuleExecutor()   : Tìm executor theo tên tool
 * - getExecutor()         : Factory trả về executor cho một tool type (module + tool lõi)
 * - getModuleParser()     : Tìm parser XML theo tên tool
 * - getModuleRenderers()  : Gộp renderer của mọi module
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import type { ComponentType } from 'react';
import type { ExecutorContext, ExecutorOptions, ToolExecutor } from '../types/executor-types';
import { executeConversationTitle } from './tool-executors/ConversationTitleExecutor';
import { codeModule } from '@renderer/modules/Code/CodeModule';
import { emulateModule } from '@renderer/modules/Emulate/EmulateModule';
import { reconModule } from '@renderer/modules/Recon/ReconModule';
import type { ToolFormatId } from './tool-format-parsers/types';
import { DEFAULT_SUPPORTED_FORMATS } from './tool-format-parsers';
// ─── Types ──────────────────────────────────────────────────────────────
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
}
// ─── Registry ───────────────────────────────────────────────────────────
const modules = new Map<string, ZenModule>();

export const registerZenModule = (mod: ZenModule): void => {
  modules.set(mod.id, mod);
};

export const getZenModule = (id: string): ZenModule | undefined => modules.get(id);

export const getZenModules = (): ZenModule[] => Array.from(modules.values());

const has = (obj: object | undefined, key: string) =>
  !!obj && Object.prototype.hasOwnProperty.call(obj, key);

export const getModuleExecutor = (actionType: string): ToolExecutor | null => {
  for (const mod of modules.values()) {
    if (has(mod.executors, actionType)) {
      return { execute: mod.executors[actionType] };
    }
  }
  return null;
};

export const getExecutor = (actionType: string): ToolExecutor | null => {
  const moduleExecutor = getModuleExecutor(actionType);
  if (moduleExecutor) return moduleExecutor;

  switch (actionType) {
    case 'conversation_title':
      return {
        execute: async (action: any, ctx: ExecutorContext, _options?: ExecutorOptions) =>
          executeConversationTitle(action.params || {}, ctx),
      };

    default:
      console.warn('[tool] No executor found for: "' + actionType + '"');
      return null;
  }
};

export const getModuleParser = (
  toolName: string,
): ((inner: string) => Record<string, any>) | null => {
  for (const mod of modules.values()) {
    if (mod.parsers && has(mod.parsers, toolName)) return mod.parsers[toolName];
  }
  return null;
};

export const getModuleRenderers = (): Record<string, ComponentType<any>> => {
  const out: Record<string, ComponentType<any>> = {};
  for (const mod of modules.values()) Object.assign(out, mod.renderers);
  return out;
};

/**
 * Resolve renderer theo module trước, fallback về registry tổng.
 * `moduleIdOrFeature` có thể là 'code' / 'recon' / 'emulate' (feature)
 * hoặc 'code:<id>' (full moduleId) — hàm sẽ strip phần sau ':'.
 */
export const getModuleRenderer = (
  moduleIdOrFeature: string | null | undefined,
  toolType: string,
): ComponentType<any> | undefined => {
  if (moduleIdOrFeature) {
    const feature = moduleIdOrFeature.split(':')[0];
    const mod = modules.get(feature) ?? modules.get(moduleIdOrFeature);
    if (mod?.renderers && has(mod.renderers, toolType)) {
      return mod.renderers[toolType];
    }
  }
  return getModuleRenderers()[toolType];
};

export const getModuleTagRegistries = (): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const mod of modules.values()) {
    if (mod.tagRegistry) Object.assign(out, mod.tagRegistry);
  }
  return out;
};

export const getModuleTagRegistriesByModule = (): Record<string, Record<string, any>> => {
  const out: Record<string, Record<string, any>> = {};
  for (const [id, mod] of modules.entries()) {
    if (mod.tagRegistry) out[id] = mod.tagRegistry;
  }
  return out;
};

export const getModuleService = (moduleId: string, serviceName: string): any => {
  const mod = getZenModule(moduleId);
  return mod?.services?.[serviceName];
};

export const getModuleServices = (moduleId: string): Record<string, any> => {
  const mod = getZenModule(moduleId);
  return mod?.services ?? {};
};

export const getModuleCapabilities = (moduleId: string): ZenModuleCapabilities => {
  const mod = getZenModule(moduleId);
  return mod?.capabilities ?? {};
};

export const getPromptCapabilities = (
  moduleId: string,
  promptId?: string,
): ZenModuleCapabilities => {
  const mod = getZenModule(moduleId);
  const moduleCapabilities = mod?.capabilities ?? {};
  
  if (!mod?.prompts?.systemPrompts) {
    return moduleCapabilities;
  }

  // Use promptId if provided, otherwise default to moduleId (main prompt)
  const key = promptId ?? moduleId;
  const descriptor = mod.prompts.systemPrompts.get(key);
  
  // Merge module-level and prompt-level capabilities
  // Module-level capabilities (like multiAgent) are inherited by all prompts
  const promptCapabilities = descriptor?.getCapabilities() ?? {};
  return { ...moduleCapabilities, ...promptCapabilities };
};

const DEFAULT_PROMPT_LENGTH: SelectableCapability = {
  options: ['none', 'short', 'medium', 'long'],
  default: 'long',
};

const DEFAULT_STYLE_CODE: SelectableCapability = {
  options: ['fast', 'balanced', 'thorough'],
  default: 'balanced',
};

export interface ResolvedSelectable {
  enabled: boolean;
  selectable: boolean;
  options: readonly string[];
  value: string;
}

const resolveSelectable = (
  cap: boolean | SelectableCapability | undefined,
  fallback: SelectableCapability,
  requested?: string,
): ResolvedSelectable => {
  if (!cap) return { enabled: false, selectable: false, options: [], value: fallback.default };
  const spec = cap === true ? fallback : cap;
  const value = requested && spec.options.includes(requested) ? requested : spec.default;
  return { enabled: true, selectable: spec.options.length > 1, options: spec.options, value };
};

export const resolvePromptLength = (caps: ZenModuleCapabilities, requested?: string) =>
  resolveSelectable(caps.promptLength, DEFAULT_PROMPT_LENGTH, requested);

export const resolveStyleCode = (caps: ZenModuleCapabilities, requested?: string) =>
  resolveSelectable(caps.styleCode, DEFAULT_STYLE_CODE, requested);

export const resolveToolFormats = (caps: ZenModuleCapabilities): ToolFormatId[] =>
  caps.toolFormats?.length ? caps.toolFormats : [...DEFAULT_SUPPORTED_FORMATS];

export const buildSystemPrompt = (
  moduleId: string,
  promptId: string | undefined,
  config: any,
): string => {
  const mod = getZenModule(moduleId);
  if (!mod?.prompts?.systemPrompts) {
    console.warn(`[ModuleRegistry] No prompts found for module: ${moduleId}`);
    return '';
  }

  const key = promptId ?? moduleId;
  const descriptor = mod.prompts.systemPrompts.get(key);
  if (!descriptor) {
    console.warn(
      `[ModuleRegistry] No system prompt found for moduleId=${moduleId}, promptId=${promptId}, key=${key}`,
    );
    return '';
  }

  const result = descriptor.buildPrompt(config);
  return result;
};

export const getToolFormatReminder = (
  moduleId: string,
  promptId: string,
  toolFormat: ToolFormatId,
): string => {
  const mod = getZenModule(moduleId);
  if (!mod?.prompts?.systemPrompts) {
    return '';
  }

  const key = promptId ?? moduleId;
  const descriptor = mod.prompts.systemPrompts.get(key);
  if (!descriptor?.buildToolFormatReminder) {
    return '';
  }

  return descriptor.buildToolFormatReminder(toolFormat);
};

[codeModule, emulateModule, reconModule].forEach(registerZenModule);

// Inject module tag registries into tag-registry to avoid circular dependency
import { injectModuleRegistries } from '../constants/tag-registry';
injectModuleRegistries(getModuleTagRegistries(), getModuleTagRegistriesByModule());
