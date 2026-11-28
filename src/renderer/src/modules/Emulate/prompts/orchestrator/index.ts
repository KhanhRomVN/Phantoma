import type { EmulatePromptConfig } from './types';
import { joinSections } from './types';
import { buildEmulateOrchestratorIdentity } from './identity';
import { buildEmulateOrchestratorWorkflow } from './workflow';
import { buildEmulateOrchestratorConstraints } from './constraints';
import { buildEmulateOrchestratorSystemContext } from './system-context';
import { buildEmulateOrchestratorToolValidation } from './tool-validation';
import { buildEmulateOrchestratorToolsReference } from './tools-reference';
import { buildEmulateOrchestratorExample } from './example';

export { buildEmulateOrchestratorIdentity } from './identity';
export { buildEmulateOrchestratorWorkflow } from './workflow';
export { buildEmulateOrchestratorConstraints } from './constraints';
export { buildEmulateOrchestratorSystemContext } from './system-context';
export { buildEmulateOrchestratorToolValidation } from './tool-validation';
export { buildEmulateOrchestratorToolsReference } from './tools-reference';
export { buildEmulateOrchestratorExample } from './example';
export { buildEmulateOrchestratorToolFormatReminder } from './tool-format-reminder';

export const buildEmulateOrchestratorPrompt = (config: EmulatePromptConfig): string => {
  const { language, systemInfo, promptLengthMode = 'long', toolFormat = 'xml', mode = 'balanced' } = config;

  if (promptLengthMode === 'none') {
    return '';
  }

  const identity = buildEmulateOrchestratorIdentity(language, toolFormat);
  const workflow = buildEmulateOrchestratorWorkflow(mode);
  const tools = buildEmulateOrchestratorToolsReference(toolFormat);
  const context = buildEmulateOrchestratorSystemContext(systemInfo);

  if (promptLengthMode === 'short') {
    return joinSections(identity, workflow, tools, context);
  }

  const validation = buildEmulateOrchestratorToolValidation(toolFormat);
  const constraints = buildEmulateOrchestratorConstraints(mode, language, toolFormat);

  if (promptLengthMode === 'medium') {
    return joinSections(identity, workflow, validation, tools, constraints, context);
  }

  return joinSections(
    identity,
    workflow,
    validation,
    tools,
    buildEmulateOrchestratorExample(toolFormat, mode),
    constraints,
    context,
  );
};