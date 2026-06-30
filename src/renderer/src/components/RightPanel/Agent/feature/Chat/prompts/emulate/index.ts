// Re-export shared prompts from ../code/
export { buildIdentityPrompt } from "../code/identity";
export { WORKFLOW } from "../code/workflow";
export { CONSTRAINTS } from "../code/constraints";
export { buildSystemContext } from "../code/system-context";
export type { SystemInfo } from "../code/system-context";
export { EXAMPLES } from "../code/examples";
export { buildAccessModePrompt } from "../code/access-mode";
export {
  PERSISTENT_RULES,
  buildPermissionModeTag,
  buildPermissionModeTagCompact,
} from "../code/persistent-rules";

// Emulate-specific
export { EMULATE_TOOLS_REFERENCE } from "./tools-reference";

// General tools (shared)
export { TOOLS_REFERENCE } from "../code/tools-reference";

import { buildIdentityPrompt } from "../code/identity";
import { WORKFLOW } from "../code/workflow";
import { CONSTRAINTS } from "../code/constraints";
import { TOOLS_REFERENCE } from "../code/tools-reference";
import { buildSystemContext } from "../code/system-context";
import type { SystemInfo } from "../code/system-context";
import { EXAMPLES } from "../code/examples";
import { buildAccessModePrompt } from "../code/access-mode";
import { EMULATE_TOOLS_REFERENCE } from "./tools-reference";

interface PromptConfig {
  language: string;
  systemInfo: SystemInfo;
  permissionMode?: string;
}

export const combinePrompts = (config: PromptConfig): string => {
  const { language, systemInfo, permissionMode } = config;

  const sections = [
    buildIdentityPrompt(language), // 1. Who I am + top-level rules
    WORKFLOW, // 2. How I work
    CONSTRAINTS, // 3. Critical constraints
    TOOLS_REFERENCE, // 4. General tools (read_file, write_to_file, etc.)
    EMULATE_TOOLS_REFERENCE, // 5. Emulate tools (list_https, get_https_detail)
    buildSystemContext(systemInfo), // 6. Environment context
    ...(permissionMode ? [buildAccessModePrompt(permissionMode)] : []), // 7. Active permission mode
    EXAMPLES, // 8. Reference patterns
  ];

  return sections.join("\n\n---\n\n");
};

/**
 * Fallback prompt — real values should come from window.api.app.getSystemInfo()
 */
export const getDefaultPrompt = (language: string = "English"): string => {
  return combinePrompts({
    language,
    systemInfo: {
      os: "Unknown OS",
      ide: "Zen IDE",
      shell: "unknown",
      homeDir: "~",
      cwd: ".",
      language,
    },
  });
};