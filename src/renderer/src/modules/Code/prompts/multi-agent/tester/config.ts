import type { ZenModuleCapabilities } from '@renderer/components/RightPanel/Zen/feature/Chat/services/moduleRegistry';

/**
 * Capabilities for the Tester workflow agent.
 * No promptLength, no styleCode; supports skill and memory; no features.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: false,
  styleCode: false,
  skill: true,
  memory: true,
  toolFormats: ['xml', 'json'],
  features: undefined,
};