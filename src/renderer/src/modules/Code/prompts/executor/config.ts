import type { ZenModuleCapabilities } from '@renderer/components/RightPanel/Zen/feature/Chat/services/ModuleRegistry';

/**
 * Capabilities for the Executor workflow agent.
 * Same prompt as the Code assistant minus commit-message, style-code, prompt-length, skill and memory.
 * Only tool-format (xml/json) is user-selectable.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: false,
  systemPromptMode: false,
  skill: false,
  memory: false,
  toolFormat: true,
};