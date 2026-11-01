import type { ZenModuleCapabilities } from '@renderer/components/RightPanel/Zen/feature/Chat/services/moduleRegistry';

/**
 * Capabilities for the Recon Local Operator workflow agent.
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