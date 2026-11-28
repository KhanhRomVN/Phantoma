import { ZenModuleCapabilities } from '@renderer/modules/Code/shared/zen/zen-bridge';

/**
 * Capabilities for the Orchestrator workflow agent.
 * No promptLength; styleCode has 3 options (affects sub-agent commands via send_message).
 * skill and memory are false; no features.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: false,
  styleCode: { options: ['fast', 'balanced', 'thorough'], default: 'balanced' },
  skill: false,
  memory: false,
  toolFormats: ['xml', 'json'],
  features: undefined,
};
