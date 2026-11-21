import type { ZenModuleCapabilities } from '@renderer/components/Widgets/Zen/feature/Chat/services/moduleRegistry';

/**
 * Capabilities for the Emulate CLI Tool workflow agent.
 * Runs terminal commands and script files; NO browser.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: true,
  styleCode: false,
  skill: false,
  memory: false,
  toolFormats: ['xml', 'json'],
  multiAgent: true,
};