import type { ZenModuleCapabilities } from '@renderer/components/Widgets/Zen/feature/Chat/services/moduleRegistry';

/**
 * Capabilities for the Recon Synthesizer workflow agent.
 * Writes .recon files; has full workspace file tools.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: true,
  styleCode: false,
  skill: false,
  memory: false,
  toolFormats: ['xml', 'json'],
  multiAgent: true,
};
