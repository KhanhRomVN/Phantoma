import { buildIdentityPrompt } from './identity';
import { WORKFLOW } from './workflow';
import { DESIGN_STACK } from './design-stack';
import { buildSystemContext } from './system-context';
import type { SystemInfo } from './system-context';
import { EXAMPLES, EXAMPLES_JSON } from './examples';
import { buildConstraints } from './constraints';
import { DESIGN_TOOLS_REFERENCE, DESIGN_TOOLS_REFERENCE_JSON } from './tools-reference';
import { DESIGN_TOOL_VALIDATION, DESIGN_TOOL_VALIDATION_JSON } from './tool-validation';

export { buildIdentityPrompt } from './identity';
export { WORKFLOW } from './workflow';
export { DESIGN_STACK } from './design-stack';
export { buildSystemContext } from './system-context';
export type { SystemInfo, DesignPageInfo } from './system-context';
export { EXAMPLES, EXAMPLES_JSON } from './examples';
export { buildConstraints } from './constraints';
export { DESIGN_TOOLS_REFERENCE, DESIGN_TOOLS_REFERENCE_JSON } from './tools-reference';
export { DESIGN_TOOL_VALIDATION, DESIGN_TOOL_VALIDATION_JSON } from './tool-validation';

// ─── Types ───────────────────────────────────────────────────────────────
export type PromptLengthMode = 'short' | 'medium' | 'long' | 'none';

export interface PromptConfig {
  language: string;
  systemInfo: SystemInfo;
  /** Which sections of the prompt to include. Default: 'long' (full). */
  promptLengthMode?: PromptLengthMode;
  /** Tool output format — 'xml' (default) or 'json'. */
  toolFormat?: 'xml' | 'json';
}

/**
 * Section ordering: static tool reference + tool validation + examples come
 * FIRST (stable cache prefix), then the design stack, identity, workflow and
 * constraints, then the most volatile block — design context — LAST.
 */
export const buildPromptForMode = (config: PromptConfig): string => {
  const { language, systemInfo, promptLengthMode = 'long', toolFormat = 'xml' } = config;

  const isJson = toolFormat === 'json';
  const toolsRef = isJson ? DESIGN_TOOLS_REFERENCE_JSON : DESIGN_TOOLS_REFERENCE;
  const toolValidation = isJson ? DESIGN_TOOL_VALIDATION_JSON : DESIGN_TOOL_VALIDATION;
  const examples = isJson ? EXAMPLES_JSON : EXAMPLES;

  if (promptLengthMode === 'none') {
    return '';
  }

  if (promptLengthMode === 'short') {
    return [
      toolsRef,
      DESIGN_STACK,
      buildIdentityPrompt(language, toolFormat),
      WORKFLOW,
      buildSystemContext(systemInfo),
    ].join('\n\n---\n\n');
  }

  if (promptLengthMode === 'medium') {
    return [
      toolValidation,
      toolsRef,
      DESIGN_STACK,
      buildIdentityPrompt(language, toolFormat),
      WORKFLOW,
      buildConstraints(language, toolFormat),
      buildSystemContext(systemInfo),
    ].join('\n\n---\n\n');
  }

  // Long — full prompt, including EXAMPLES.
  return [
    toolValidation,
    toolsRef,
    examples,
    DESIGN_STACK,
    buildIdentityPrompt(language, toolFormat),
    WORKFLOW,
    buildConstraints(language, toolFormat),
    buildSystemContext(systemInfo),
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
    systemInfo: { language },
  });
};