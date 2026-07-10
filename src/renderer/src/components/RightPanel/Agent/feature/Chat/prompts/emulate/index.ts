import { buildIdentityPrompt } from './identity';
import { WORKFLOW } from './workflow';
import { buildSystemContext } from './system-context';
import type { SystemInfo } from './system-context';
import { EXAMPLES } from './examples';
import { buildAccessModePrompt } from './access-mode';
import { CONSTRAINTS } from './constraints';
import { EMULATE_TOOLS_REFERENCE } from './tools-reference';

export { buildIdentityPrompt } from './identity';
export { WORKFLOW } from './workflow';
export { buildSystemContext } from './system-context';
export type { SystemInfo } from './system-context';
export { EXAMPLES } from './examples';
export { buildAccessModePrompt } from './access-mode';
export { EMULATE_TOOLS_REFERENCE } from './tools-reference';
export {
  PERSISTENT_RULES,
  buildPermissionModeTag,
  buildPermissionModeTagCompact,
} from './reminder';

interface PromptConfig {
  language: string;
  systemInfo: SystemInfo;
  permissionMode?: string;
}

export const combinePrompts = (config: PromptConfig): string => {
  const { language, systemInfo, permissionMode } = config;

  const sections = [
    buildIdentityPrompt(language), // 1. Who I am — network analysis & reverse engineering expert
    WORKFLOW, // 2. How I work
    CONSTRAINTS, // 3. Critical constraints
    EMULATE_TOOLS_REFERENCE, // 4. General & Emulate tools (list_https, get_https_detail, etc.)
    buildSystemContext(systemInfo), // 5. Environment context
    ...(permissionMode ? [buildAccessModePrompt(permissionMode)] : []), // 6. Active permission mode
    EXAMPLES, // 7. Reference patterns
  ];

  return sections.join('\n\n---\n\n');
};

/**
 * Fallback prompt — real values should come from window.api.app.getSystemInfo()
 */
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
