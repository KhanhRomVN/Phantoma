import type { ZenModuleCapabilities } from '@renderer/components/RightPanel/Zen/feature/Chat/services/ModuleRegistry';

/**
 * Capabilities for the Orchestrator workflow agent.
 * Orchestrator coordinates sub-agents and has no file/skill/memory tools.
 * Supports prompt-length (short/medium/long) and tool-format (xml/json).
 * systemPromptMode is not user-selectable here; PromptBuilder passes its default
 * ('balanced') as `mode`, which still drives the ask policy and reply depth.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: true,
  systemPromptMode: false,
  skill: false,
  memory: false,
  toolFormat: true,
  multiAgent: true,
};