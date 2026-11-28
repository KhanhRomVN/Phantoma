import { ZenModuleCapabilities } from '@renderer/components/Widgets/Zen/features/chat/types/zen_module.types';

/**
 * Capabilities for the Emulate Executor workflow agent.
 * Uses fixed 'long' promptLength and 'fast' styleCode.
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
