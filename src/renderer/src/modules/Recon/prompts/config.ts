import type { ZenModuleCapabilities } from '@renderer/components/RightPanel/Zen/feature/Chat/services/ModuleRegistry';

/**
 * Capabilities for the Recon system prompt.
 * Recon agent controls browser automation and web reconnaissance.
 * Supports prompt-length (short/medium/long) and tool-format (xml/json).
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: true,
  systemPromptMode: false,
  skill: false,
  memory: false,
  toolFormat: true,
};