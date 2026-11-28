import type { EmulatePromptConfig } from './types';
import { joinSections } from './types';
import { buildEmulateExecutorIdentity } from './identity';
import { buildEmulateExecutorWorkflow } from './workflow';
import { buildEmulateExecutorConstraints } from './constraints';
import { buildEmulateExecutorSystemContext } from './system-context';
import { EMULATE_EXECUTOR_TOOL_VALIDATION_XML, EMULATE_EXECUTOR_TOOL_VALIDATION_JSON } from './tool-validation';
import { EMULATE_EXECUTOR_TOOLS_REFERENCE_XML, EMULATE_EXECUTOR_TOOLS_REFERENCE_JSON } from './tools-reference';
import { buildEmulateExecutorExample } from './example';

export { buildEmulateExecutorIdentity } from './identity';
export { buildEmulateExecutorWorkflow, RESULT_FORMAT } from './workflow';
export { buildEmulateExecutorConstraints } from './constraints';
export { buildEmulateExecutorSystemContext } from './system-context';
export { EMULATE_EXECUTOR_TOOL_VALIDATION_XML, EMULATE_EXECUTOR_TOOL_VALIDATION_JSON } from './tool-validation';
export { EMULATE_EXECUTOR_TOOLS_REFERENCE_XML, EMULATE_EXECUTOR_TOOLS_REFERENCE_JSON } from './tools-reference';
export { buildEmulateExecutorExample } from './example';
export { buildEmulateExecutorToolFormatReminder } from './tool-format-reminder';

export const buildEmulateExecutorPrompt = (config: EmulatePromptConfig): string => {
  const { language, systemInfo, toolFormat = 'xml', mode = 'balanced' } = config;
  const isJson = toolFormat === 'json';

  return joinSections(
    isJson ? EMULATE_EXECUTOR_TOOL_VALIDATION_JSON : EMULATE_EXECUTOR_TOOL_VALIDATION_XML,
    isJson ? EMULATE_EXECUTOR_TOOLS_REFERENCE_JSON : EMULATE_EXECUTOR_TOOLS_REFERENCE_XML,
    buildEmulateExecutorExample(toolFormat),
    buildEmulateExecutorIdentity(language, mode, toolFormat),
    buildEmulateExecutorWorkflow(mode),
    buildEmulateExecutorConstraints(mode, language, toolFormat),
    buildEmulateExecutorSystemContext(systemInfo, mode),
  );
};