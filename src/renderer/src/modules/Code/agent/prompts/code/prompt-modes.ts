import type { SystemPromptMode } from './config';
import { DEFAULT_TOOL_FORMAT, type ToolFormat } from './tool-format';
import type { SystemInfo } from './system-context';
import { buildIdentityPrompt } from './identity';
import { buildWorkflow } from './workflow';
import { buildConstraints } from './constraints';
import { buildExample } from './example';
import { getToolReference } from './tools-reference';
import { getToolValidation } from './tool-validation';
import { buildSystemContext } from './system-context';

export type { SystemPromptMode } from './config';

export type PromptLengthMode = 'short' | 'medium' | 'long' | 'none';

export interface PromptModeConfig {
  language: string;
  systemInfo: SystemInfo;
  promptLengthMode?: PromptLengthMode;
  toolFormat?: ToolFormat;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────────────────────

/** Everything a section builder may need. */
interface BuildContext {
  mode: SystemPromptMode;
  language: string;
  systemInfo: SystemInfo;
  toolFormat: ToolFormat;
}

type SectionKey =
  | 'validation'
  | 'reference'
  | 'example'
  | 'identity'
  | 'workflow'
  | 'constraints'
  | 'systemContext';

const SECTION_BUILDERS: Record<SectionKey, (ctx: BuildContext) => string> = {
  validation: ({ toolFormat }) => getToolValidation(toolFormat),
  reference: ({ toolFormat }) => getToolReference(toolFormat),
  example: ({ mode, toolFormat }) => buildExample(mode, toolFormat),
  identity: ({ language, mode, toolFormat }) => buildIdentityPrompt(language, mode, toolFormat),
  workflow: ({ mode, toolFormat }) => buildWorkflow(mode, toolFormat),
  constraints: ({ mode, language, toolFormat }) => buildConstraints(mode, language, toolFormat),
  systemContext: ({ systemInfo, mode }) => buildSystemContext(systemInfo, mode),
};

const LENGTH_PLANS: Record<Exclude<PromptLengthMode, 'none'>, readonly SectionKey[]> = {
  // Ultra compact: tool reference + minimal identity/workflow + system context.
  short: ['reference', 'identity', 'workflow', 'systemContext'],
  medium: ['validation', 'reference', 'identity', 'workflow', 'constraints', 'systemContext'],
  // Full prompt, including EXAMPLES (trimmed per mode by buildExample).
  long: [
    'validation',
    'reference',
    'example',
    'identity',
    'workflow',
    'constraints',
    'systemContext',
  ],
};

const SECTION_SEPARATOR = '\n\n---\n\n';

export function buildPromptForMode(config: PromptModeConfig, mode: SystemPromptMode): string {
  const {
    language,
    systemInfo,
    promptLengthMode = 'long',
    toolFormat = DEFAULT_TOOL_FORMAT,
  } = config;

  if (promptLengthMode === 'none') return '';

  const ctx: BuildContext = { mode, language, systemInfo, toolFormat };
  return LENGTH_PLANS[promptLengthMode]
    .map((key) => SECTION_BUILDERS[key](ctx))
    .join(SECTION_SEPARATOR);
}
