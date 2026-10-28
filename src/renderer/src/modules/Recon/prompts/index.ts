// ─── Shared ──────────────────────────────────────────────────────────────
export { RECON_FORMAT_GUIDE } from './recon-format';
export type {
  ToolFormat,
  SystemPromptMode,
  PromptLengthMode,
  SystemInfo,
  WorkflowAgentPromptConfig,
} from './types';
export { joinSections } from './types';
export { buildSubAgentMessaging } from './messaging';
export type { SubAgentKind } from './messaging';

// ─── Multi-agent workflow prompts ─────────────────────────────────────────
export { buildOrchestratorPrompt } from './orchestrator';
export { buildPlannerPrompt } from './planner';
export { buildWebCollectorPrompt } from './web-collector';
export { buildLocalOperatorPrompt } from './local-operator';
export { buildVerifierPrompt } from './verifier';
export { buildSynthesizerPrompt } from './synthesizer';