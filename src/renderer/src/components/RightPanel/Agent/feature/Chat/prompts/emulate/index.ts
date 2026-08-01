import { buildIdentityPrompt } from './identity';
import { WORKFLOW } from './workflow';
import { buildSystemContext } from './system-context';
import type { SystemInfo } from './system-context';
import { EXAMPLES } from './examples';
import { CONSTRAINTS } from './constraints';
import { EMULATE_TOOLS_REFERENCE } from './tools-reference';

export { buildIdentityPrompt } from './identity';
export { WORKFLOW } from './workflow';
export { buildSystemContext } from './system-context';
export type { SystemInfo } from './system-context';
export { EXAMPLES } from './examples';
export { CONSTRAINTS } from './constraints';
export { EMULATE_TOOLS_REFERENCE } from './tools-reference';
export { buildTrafficContext, buildEmptyTrafficContext } from './traffic-context';
export type { TrafficSummary } from './traffic-context';

interface PromptConfig {
  language: string;
  systemInfo: SystemInfo;
  permissionMode?: string;
}

export const combinePrompts = (config: PromptConfig): string => {
  const { language, systemInfo } = config;

  const sections = [
    buildIdentityPrompt(language),
    WORKFLOW,
    CONSTRAINTS,
    EMULATE_TOOLS_REFERENCE,
    buildSystemContext(systemInfo),
    EXAMPLES,
  ];

  return sections.join('\n\n---\n\n');
};

export const getDefaultPrompt = (language: string = 'English'): string => {
  return combinePrompts({
    language,
    systemInfo: {
      os: 'Unknown OS',
      ide: 'Zen IDE',
      shell: 'unknown',
      homeDir: '~',
      cwd: '.',
      language,
    },
  });
};