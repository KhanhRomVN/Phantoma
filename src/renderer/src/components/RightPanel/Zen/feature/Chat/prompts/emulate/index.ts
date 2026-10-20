import { buildIdentityPrompt } from './identity';
import { WORKFLOW } from './workflow';
import { buildSystemContext } from './system-context';
import type { SystemInfo } from './system-context';
import { EXAMPLES, EXAMPLES_JSON } from './examples';
import { buildConstraints } from './constraints';
import {
  EMULATE_TOOLS_REFERENCE,
  EMULATE_TOOLS_REFERENCE_JSON,
} from './tools-reference';
import {
  EMULATE_TOOL_VALIDATION,
  EMULATE_TOOL_VALIDATION_JSON,
} from './tool-validation';

export { buildIdentityPrompt } from './identity';
export { WORKFLOW } from './workflow';
export { buildSystemContext } from './system-context';
export type { SystemInfo } from './system-context';
export { EXAMPLES, EXAMPLES_JSON } from './examples';
export { buildConstraints } from './constraints';
export {
  EMULATE_TOOLS_REFERENCE,
  EMULATE_TOOLS_REFERENCE_JSON,
} from './tools-reference';
export {
  EMULATE_TOOL_VALIDATION,
  EMULATE_TOOL_VALIDATION_JSON,
} from './tool-validation';
export { buildTrafficContext, buildEmptyTrafficContext } from './traffic-context';
export type { TrafficSummary } from './traffic-context';
export { buildFilterContext, buildEmptyFilterContext } from './filter-context';

// ─── Types ───────────────────────────────────────────────────────────────
export type PromptLengthMode = 'short' | 'medium' | 'long' | 'none';

export interface PromptConfig {
  language: string;
  systemInfo: SystemInfo;
  permissionMode?: string;
  /** Which sections of the prompt to include. Default: 'long' (full). */
  promptLengthMode?: PromptLengthMode;
  /** Tool output format — 'xml' (default) or 'json'. */
  toolFormat?: 'xml' | 'json';
}

/**
 * Section ordering: static tool reference + tool validation + examples come
 * FIRST (stable cache prefix), then identity/workflow/constraints, then the
 * most volatile block — system context — LAST.
 */
export const buildPromptForMode = (config: PromptConfig): string => {
  const {
    language,
    systemInfo,
    promptLengthMode = 'long',
    toolFormat = 'xml',
  } = config;

  const isJson = toolFormat === 'json';
  const toolsRef = isJson ? EMULATE_TOOLS_REFERENCE_JSON : EMULATE_TOOLS_REFERENCE;
  const toolValidation = isJson
    ? EMULATE_TOOL_VALIDATION_JSON
    : EMULATE_TOOL_VALIDATION;
  const examples = isJson ? EXAMPLES_JSON : EXAMPLES;

  if (promptLengthMode === 'none') {
    return '';
  }

  if (promptLengthMode === 'short') {
    return [
      toolsRef,
      buildIdentityPrompt(language, toolFormat),
      WORKFLOW,
      buildSystemContext(systemInfo, toolFormat),
    ].join('\n\n---\n\n');
  }

  if (promptLengthMode === 'medium') {
    return [
      toolValidation,
      toolsRef,
      buildIdentityPrompt(language, toolFormat),
      WORKFLOW,
      buildConstraints(toolFormat),
      buildSystemContext(systemInfo, toolFormat),
    ].join('\n\n---\n\n');
  }

  // Long — full prompt, including EXAMPLES.
  return [
    toolValidation,
    toolsRef,
    examples,
    buildIdentityPrompt(language, toolFormat),
    WORKFLOW,
    buildConstraints(toolFormat),
    buildSystemContext(systemInfo, toolFormat),
  ].join('\n\n---\n\n');
};

/**
 * Backward-compat: default full prompt.
 */
export const combinePrompts = (config: PromptConfig): string => {
  return buildPromptForMode(config);
};

export const getDefaultPrompt = (language: string = 'English'): string => {
  return buildPromptForMode({
    language,
    systemInfo: {
      os: 'Unknown OS',
      ide: 'Zen IDE',
      shell: 'unknown',
      homeDir: '~',
      cwd: '.',
      language,
    },
  });
};