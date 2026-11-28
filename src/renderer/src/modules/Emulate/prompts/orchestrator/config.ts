import { ZenModuleCapabilities } from '@renderer/components/Widgets/Zen/features/chat/types/zen_module.types';

/**
 * Capabilities for the Emulate Orchestrator workflow agent.
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
