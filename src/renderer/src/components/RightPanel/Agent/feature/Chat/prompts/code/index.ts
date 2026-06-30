import { buildIdentityPrompt } from "./identity";
import { WORKFLOW } from "./workflow";
import { TOOLS_REFERENCE } from "./tools-reference";
import { buildSystemContext } from "./system-context";
import type { SystemInfo } from "./system-context";
import { EXAMPLES } from "./examples";
import { CONSTRAINTS } from "./constraints";
import { EMULATE_TOOLS_REFERENCE } from "../emulate/tools-reference";
import { buildAccessModePrompt } from "./access-mode";

export { buildIdentityPrompt } from "./identity";
export { WORKFLOW } from "./workflow";
export { TOOLS_REFERENCE } from "./tools-reference";
export { buildSystemContext } from "./system-context";
export type { SystemInfo } from "./system-context";
export { EXAMPLES } from "./examples";
export { CONSTRAINTS } from "./constraints";
export { EMULATE_TOOLS_REFERENCE } from "../emulate/tools-reference";
export { buildAccessModePrompt } from "./access-mode";
export { PERSISTENT_RULES, buildPermissionModeTag, buildPermissionModeTagCompact } from "./persistent-rules";

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
    TOOLS_REFERENCE, // 4. Response tags (thinking, markdown, question)
    EMULATE_TOOLS_REFERENCE, // 5. Emulate tools (list_https, etc.)
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
