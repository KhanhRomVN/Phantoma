/**
 * ------------------------------------------------------------------
 * Zen Module Registry
 * ------------------------------------------------------------------
 * Mỗi module (Code/Emulate/Recon/Design...) tự khai báo những gì nó
 * đóng góp cho Zen qua một ZenModule, Zen chỉ tra cứu qua registry.
 * Việc import và đăng ký module cụ thể do bootstrap của Zen đảm nhiệm.
 *
 * Main functions:
 * - registerZenModule()   : Đăng ký module lúc runtime
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
import type { ExecutorContext, ExecutorOptions, ToolExecutor } from '../types/executor.types';
import type { ZenModule } from '../types/zen_module.types';
import { executeConversationTitle } from '../executors/conversation_title.executor';


// ─── Registry ───────────────────────────────────────────────────────────
const modules = new Map<string, ZenModule>();

export const registerZenModule = (mod: ZenModule): void => {
  modules.set(mod.id, mod);
};

export const getZenModule = (id: string): ZenModule | undefined => modules.get(id);

export const getZenModules = (): ZenModule[] => Array.from(modules.values());

export const resolveConversationModuleId = (feature?: string | null): string | null => {
  const id = feature ?? (window as any).__activeFeature;
  return (id && modules.get(id)?.getConversationScope?.()) || null;
};

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
