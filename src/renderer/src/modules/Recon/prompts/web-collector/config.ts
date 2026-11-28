import { ZenModuleCapabilities } from '@renderer/components/Widgets/Zen/features/chat/types/zen_module.types';

/**
 * Capabilities for the Recon Web Collector workflow agent.
 * Controls the browser; no terminal, no .recon writing.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: true,
  styleCode: false,
  skill: false,
  memory: false,
  toolFormats: ['xml', 'json'],
  multiAgent: true,
};
