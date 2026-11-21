import type { ZenModuleCapabilities } from '@renderer/components/Widgets/Zen/feature/Chat/services/moduleRegistry';

/**
 * Capabilities for the Emulate Planner workflow agent.
 * Plans traffic-analysis work; has read-only file tools only.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: true,
  styleCode: false,
  skill: false,
  memory: false,
  toolFormats: ['xml', 'json'],
  multiAgent: true,
};