import type { ZenModuleCapabilities } from '@renderer/components/Widgets/Zen/feature/Chat/services/moduleRegistry';

/**
 * Capabilities for the Emulate system prompt.
 * Emulate agent controls mobile/web app emulation and traffic inspection.
 * Supports prompt-length (short/medium/long) and tool-format (xml/json).
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: true,
  styleCode: false,
  skill: false,
  memory: false,
  toolFormats: ['xml', 'json'],
};
