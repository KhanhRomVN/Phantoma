import { buildIdentityPrompt } from './identity';
import { WORKFLOW } from './workflow';
import { buildSystemContext } from './system-context';
import type { SystemInfo } from './system-context';
import { EXAMPLES, EXAMPLES_JSON } from './examples';
import { buildConstraints } from './constraints';
import {
  RECON_TOOLS_REFERENCE,
  RECON_TOOLS_REFERENCE_JSON,
} from './tools-reference';
import {
  RECON_TOOL_VALIDATION,
  RECON_TOOL_VALIDATION_JSON,
} from './tool-validation';
import { RECON_FORMAT_GUIDE } from './recon-format';

export { buildIdentityPrompt } from './identity';
export { WORKFLOW } from './workflow';
export { buildSystemContext } from './system-context';
export type { SystemInfo } from './system-context';
export { EXAMPLES, EXAMPLES_JSON } from './examples';
export { buildConstraints } from './constraints';
export {
  RECON_TOOLS_REFERENCE,
  RECON_TOOLS_REFERENCE_JSON,
} from './tools-reference';
export {
  RECON_TOOL_VALIDATION,
  RECON_TOOL_VALIDATION_JSON,
} from './tool-validation';
export { RECON_FORMAT_GUIDE } from './recon-format';

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
  const toolsRef = `${
    isJson ? RECON_TOOLS_REFERENCE_JSON : RECON_TOOLS_REFERENCE
  }\n\n${RECON_FORMAT_GUIDE}`;
  const toolValidation = isJson
    ? RECON_TOOL_VALIDATION_JSON
    : RECON_TOOL_VALIDATION;
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