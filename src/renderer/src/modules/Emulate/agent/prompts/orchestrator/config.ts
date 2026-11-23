import type { ZenModuleCapabilities } from '@renderer/components/Widgets/Zen/screens/Chat/services/moduleRegistry';

/**
 * Capabilities for the Emulate Orchestrator workflow agent.
 * Coordinates sub-agents and writes the final reports; no browser, no terminal.
 */
export const CAPABILITIES: ZenModuleCapabilities = {
  promptLength: true,
  styleCode: false,
  skill: false,
  memory: false,
  toolFormats: ['xml', 'json'],
  multiAgent: true,
};
