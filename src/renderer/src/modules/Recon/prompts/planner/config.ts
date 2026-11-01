import type { ZenModuleCapabilities } from '@renderer/components/RightPanel/Zen/feature/Chat/services/moduleRegistry';

/**
 * Capabilities for the Recon OSINT Planner workflow agent.
 * Plans collection; has read-only file tools only.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: true,
  styleCode: false,
  skill: false,
  memory: false,
  toolFormats: ['xml', 'json'],
  multiAgent: true,
};