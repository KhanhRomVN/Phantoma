import type { WorkflowAgentPromptConfig } from './types';
import { joinSections } from './types';
import { buildCliToolToolValidation } from './tool-validation';
import { buildCliToolToolsReference } from './tools-reference';
import { buildCliToolExample } from './example';
import { buildCliToolIdentity } from './identity';
import { buildCliToolWorkflow } from './workflow';
import { buildCliToolConstraints, buildCliToolCoreRules } from './constraints';
import { buildCliToolSystemContext } from './system-context';
import { buildSubAgentMessaging } from './messaging';

export { buildCliToolIdentity } from './identity';
export { buildCliToolWorkflow, RESULT_FORMAT } from './workflow';
export { buildCliToolConstraints, buildCliToolCoreRules } from './constraints';
export { buildCliToolSystemContext } from './system-context';
export { buildCliToolToolValidation } from './tool-validation';
export { CLI_TOOL_TOOLS, buildCliToolToolsReference } from './tools-reference';
export { buildCliToolExample } from './example';

export const buildCliToolPrompt = (config: WorkflowAgentPromptConfig): string => {
  const {
    language,
    systemInfo,
    promptLengthMode = 'long',
    toolFormat = 'xml',
    mode = 'balanced',
  } = config;

  if (promptLengthMode === 'none') return '';

  const tools = buildCliToolToolsReference(toolFormat);
  const identity = buildCliToolIdentity(language, toolFormat);
  const workflow = buildCliToolWorkflow(mode);
  const context = buildCliToolSystemContext(systemInfo);
  const messaging = buildSubAgentMessaging('emulate_cli', toolFormat, 'RESULT|QUESTION');

  if (promptLengthMode === 'short') {
    return joinSections([
      identity,
      buildCliToolCoreRules(language, toolFormat),
      workflow,
      tools,
      context,
    ]);
  }

  const validation = buildCliToolToolValidation(toolFormat);
  const constraints = buildCliToolConstraints(mode, language, toolFormat);

  if (promptLengthMode === 'medium') {
    return joinSections([identity, workflow, constraints, messaging, validation, tools, context]);
  }

  return joinSections([
    identity,
    workflow,
    constraints,
    messaging,
    validation,
    tools,
    buildCliToolExample(toolFormat),
    context,
  ]);
};