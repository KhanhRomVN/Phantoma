/**
 * System-prompt module — public API.
 *
 * Bên ngoài chỉ import từ file này. Nhóm file & luồng ghép prompt: xem README.md.
 */

import { buildPromptForMode } from './prompt-modes';
import type { SystemPromptMode, PromptModeConfig } from './prompt-modes';

// ── Build prompt ─────────────────────────────────────────────────────────────
export { buildPromptForMode } from './prompt-modes';
export type { SystemPromptMode, PromptModeConfig, PromptLengthMode } from './prompt-modes';

// ── Code style (phong cách code theo mode) & tool format ─────────────────────
export { MODE_BEHAVIORS } from './config';
export type { ModeBehaviorConfig } from './config';
export { DEFAULT_TOOL_FORMAT } from './tool-format';
export type { ToolFormat } from "./tool-format";
// ── Sections ─────────────────────────────────────────────────────────────────
export { buildIdentityPrompt } from './identity';
export { buildWorkflow } from './workflow';
export { buildConstraints } from './constraints';
export { buildSystemContext } from './system-context';
export type { SystemInfo } from "./system-context";
export { getCommitMessagePrompt } from './commit-message';
// EXAMPLE used to be a plain constant; it is now mode-aware (see example.ts)
// so it is exported as a builder function instead.
export { buildExample } from './example';

// ── Tool reference & validation (one lookup per file, all formats) ───────────
export { getToolReference, TOOLS_REFERENCE_XML as TOOLS_REFERENCE } from './tools-reference';
export { getToolValidation, TOOL_VALIDATION_XML as TOOL_VALIDATION } from './tool-validation';

// ── Convenience helpers ──────────────────────────────────────────────────────
import type { SystemInfo } from './system-context';

interface PromptConfig {
  language: string;
  systemInfo: SystemInfo;
}

/** Build system prompt cho mode balanced (mặc định). */
export const combinePrompts = (config: PromptConfig): string => {
  return buildPromptForMode(config, 'balanced');
};

export const getDefaultPrompt = (language: string = 'English'): string => {
  return buildPromptForMode(
    {
      language,
      systemInfo: {
        os: 'Unknown OS',
        shell: 'unknown',
        homeDir: '~',
        cwd: '.',
        language,
      },
    },
    'balanced',
  );
};

/** Build system prompt theo mode. */
export const combinePromptsForMode = (config: PromptModeConfig, mode: SystemPromptMode): string => {
  return buildPromptForMode(config, mode);
};
