import { buildIdentityPrompt } from './identity';
import { WORKFLOW } from './workflow';
import { buildSystemContext } from './system-context';
import type { SystemInfo } from './system-context';
import { EXAMPLES } from './examples';
import { CONSTRAINTS } from './constraints';
import { RECON_TOOLS_REFERENCE } from './tools-reference';

export { buildIdentityPrompt } from './identity';
export { WORKFLOW } from './workflow';
export { buildSystemContext } from './system-context';
export type { SystemInfo } from './system-context';
export { EXAMPLES } from './examples';
export { CONSTRAINTS } from './constraints';
export { RECON_TOOLS_REFERENCE } from './tools-reference';

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
    RECON_TOOLS_REFERENCE,
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
