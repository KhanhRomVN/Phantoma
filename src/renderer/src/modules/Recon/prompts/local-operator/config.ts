import { ZenModuleCapabilities } from '@renderer/components/Widgets/Zen/features/chat/types/zen_module.types';

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
