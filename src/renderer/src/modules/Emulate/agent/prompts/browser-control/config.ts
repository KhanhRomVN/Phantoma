import type { ZenModuleCapabilities } from '@renderer/components/Widgets/Zen/screens/Chat/services/moduleRegistry';

/**
 * Capabilities for the Emulate Browser Control workflow agent.
 * Drives the browser to trigger traffic; no terminal, no report writing.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: true,
  styleCode: false,
  skill: false,
  memory: false,
  toolFormats: ['xml', 'json'],
  multiAgent: true,
};
