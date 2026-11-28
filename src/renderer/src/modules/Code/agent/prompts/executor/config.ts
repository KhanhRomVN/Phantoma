import { ZenModuleCapabilities } from '@renderer/modules/Code/shared/zen/zen-bridge';

/**
 * Capabilities for the Executor workflow agent.
 * Uses fixed 'long' promptLength and 'fast' styleCode (like code prompt).
 * Supports skill and memory; no features.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: { options: ['long'], default: 'long' },
  styleCode: { options: ['fast'], default: 'fast' },
  skill: true,
  memory: true,
  toolFormats: ['xml', 'json'],
  features: undefined,
};
