import type { ZenModuleCapabilities } from '@renderer/components/RightPanel/Zen/feature/Chat/services/ModuleRegistry';

/**
 * Capabilities for the Emulate system prompt.
 * Emulate agent controls mobile/web app emulation and traffic inspection.
 * Supports prompt-length (short/medium/long) and tool-format (xml/json).
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: true,
  systemPromptMode: false,
  skill: false,
  memory: false,
  toolFormat: true,
};