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
import { executeConversationTitle } from './tool-executors/TitleExecutor';
import { executeRunCommand } from './tool-executors/RunCommandExecutor';
import { codeModule } from '@renderer/modules/Code/CodeModule';
import { emulateModule } from '@renderer/modules/Emulate/EmulateModule';
import { reconModule } from '@renderer/modules/Recon/zenModule';

// ─── Types ──────────────────────────────────────────────────────────────
export interface SystemPromptDescriptor {
  /** Get capabilities for this prompt */
  getCapabilities: () => ZenModuleCapabilities;
  /** Build the full system prompt */
  buildPrompt: (config: any) => string;
}

export interface ZenModulePrompts {
  /** Map of promptId -> descriptor. Main prompt uses module id as key (e.g. 'code', 'emulate', 'recon') */
  systemPrompts: Map<string, SystemPromptDescriptor>;
}

export interface ZenModuleCapabilities {
  /** Hỗ trợ prompt-length selector (short/medium/long/none) */
  promptLength?: boolean;
  /** Hỗ trợ system-prompt-mode dropdown (balanced/concise/thorough/autopilot) */
  systemPromptMode?: boolean;
  /** Hỗ trợ skill instructions toggle */
  skill?: boolean;
  /** Hỗ trợ global memory toggle */
  memory?: boolean;
  /** Hỗ trợ xml/json tool format toggle */
  toolFormat?: boolean;
  /** Hỗ trợ nút bật multi-agent (liên kết Zen tab làm Orchestrator của branch) */
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

    case 'run_command':
      return {
        execute: async (action: any, ctx: ExecutorContext, _options?: ExecutorOptions) =>
          executeRunCommand(action, ctx),
      };

    case 'git_status':
    case 'commit_message':
      return null;

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

export const getModuleTagRegistries = (): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const mod of modules.values()) {
    if (mod.tagRegistry) Object.assign(out, mod.tagRegistry);
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
  if (!mod?.prompts?.systemPrompts) {
    return mod?.capabilities ?? {};
  }

  // Use promptId if provided, otherwise default to moduleId (main prompt)
  const key = promptId ?? moduleId;
  const descriptor = mod.prompts.systemPrompts.get(key);
  if (descriptor) {
    return descriptor.getCapabilities();
  }

  // Fallback to module-level capabilities
  return mod?.capabilities ?? {};
};

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

[codeModule, emulateModule, reconModule].forEach(registerZenModule);

// Inject module tag registries into tag-registry to avoid circular dependency
import { injectModuleRegistries } from '../constants/tag-registry';
injectModuleRegistries(getModuleTagRegistries());
