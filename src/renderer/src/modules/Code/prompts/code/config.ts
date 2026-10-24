import type { ZenModuleCapabilities } from '@renderer/components/RightPanel/Zen/feature/Chat/services/ModuleRegistry';

/**
 * Capabilities for the Code system prompt.
 * Full feature set: style-code modes, skill instructions, memory, tool format, prompt length.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: true,
  systemPromptMode: true,
  skill: true,
  memory: true,
  toolFormat: true,
  multiAgent: true,
};