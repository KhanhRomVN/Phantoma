/**
 * ------------------------------------------------------------------
 * Module Prompt Service
 * ------------------------------------------------------------------
 * Resolve prompt capabilities, các lựa chọn selectable (length/style/
 * tool format) và system prompt của một ZenModule.
 *
 * Main functions:
 * - getModuleCapabilities()   : Capabilities cấp module
 * - getPromptCapabilities()   : Capabilities đã gộp module + prompt
 * - resolvePromptLength()     : Resolve lựa chọn prompt length
 * - resolveStyleCode()        : Resolve lựa chọn style code
 * - resolveToolFormats()      : Danh sách tool format được hỗ trợ
 * - buildSystemPrompt()       : Build system prompt của module
 * - getToolFormatReminder()   : Build reminder cho tool format
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { TOOL_FORMAT_IDS } from '../constants/tool_formats';
import { getZenModule } from '../registries/module.registry';
import type { ToolFormatId } from '../types/tool_format.types';
import type {
  ResolvedSelectable,
  SelectableCapability,
  ZenModuleCapabilities,
} from '../types/zen_module.types';

// ─── Constants ──────────────────────────────────────────────────────────
const DEFAULT_PROMPT_LENGTH: SelectableCapability = {
  options: ['none', 'short', 'medium', 'long'],
  default: 'long',
};

const DEFAULT_STYLE_CODE: SelectableCapability = {
  options: ['fast', 'balanced', 'thorough'],
  default: 'balanced',
};

// ─── Capabilities ───────────────────────────────────────────────────────
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

  // Module-level capabilities (like multiAgent) are inherited by all prompts
  const promptCapabilities = descriptor?.getCapabilities() ?? {};
  return { ...moduleCapabilities, ...promptCapabilities };
};

// ─── Selectable resolvers ───────────────────────────────────────────────
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
  caps.toolFormats?.length ? caps.toolFormats : [...TOOL_FORMAT_IDS];

// ─── System prompt ──────────────────────────────────────────────────────
export const buildSystemPrompt = (
  moduleId: string,
  promptId: string | undefined,
  config: any,
): string => {
  const mod = getZenModule(moduleId);
  if (!mod?.prompts?.systemPrompts) {
    console.warn(`[ModulePrompt] No prompts found for module: ${moduleId}`);
    return '';
  }

  const key = promptId ?? moduleId;
  const descriptor = mod.prompts.systemPrompts.get(key);
  if (!descriptor) {
    console.warn(
      `[ModulePrompt] No system prompt found for moduleId=${moduleId}, promptId=${promptId}, key=${key}`,
    );
    return '';
  }

  return descriptor.buildPrompt(config);
};

export const getToolFormatReminder = (
  moduleId: string,
  promptId: string,
  toolFormat: ToolFormatId,
): string => {
  const mod = getZenModule(moduleId);
  const key = promptId ?? moduleId;
  const descriptor = mod?.prompts?.systemPrompts?.get(key);
  return descriptor?.buildToolFormatReminder?.(toolFormat) ?? '';
};