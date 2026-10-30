import type { WorkflowAgentPromptConfig } from '../types';
import { joinSections } from '../types';
import { buildWebCollectorToolValidation } from './tool-validation';
import { buildWebCollectorToolsReference } from './tools-reference';
import { buildWebCollectorExample } from './example';
import { buildWebCollectorIdentity } from './identity';
import { buildWebCollectorWorkflow } from './workflow';
import { buildWebCollectorConstraints, buildWebCollectorCoreRules } from './constraints';
import { buildWebCollectorSystemContext } from './system-context';
import { buildSubAgentMessaging } from '../messaging';

export { buildWebCollectorIdentity } from './identity';
export { buildWebCollectorWorkflow, RESULT_FORMAT } from './workflow';
export { buildWebCollectorConstraints, buildWebCollectorCoreRules } from './constraints';
export { buildWebCollectorSystemContext } from './system-context';
export { buildWebCollectorToolValidation } from './tool-validation';
export { WEB_COLLECTOR_TOOLS, buildWebCollectorToolsReference } from './tools-reference';
export { buildWebCollectorExample } from './example';

export const buildWebCollectorPrompt = (config: WorkflowAgentPromptConfig): string => {
  const {
    language,
    systemInfo,
    promptLengthMode = 'long',
    toolFormat = 'xml',
    mode = 'balanced',
  } = config;

  if (promptLengthMode === 'none') return '';

  const tools = buildWebCollectorToolsReference(toolFormat);
  const identity = buildWebCollectorIdentity(language, toolFormat);
  const workflow = buildWebCollectorWorkflow(mode);
  const context = buildWebCollectorSystemContext(systemInfo);
  const messaging = buildSubAgentMessaging('recon_web', toolFormat, 'RESULT|QUESTION');

  if (promptLengthMode === 'short') {
    return joinSections([
      identity,
      buildWebCollectorCoreRules(language, toolFormat),
      workflow,
      tools,
      context,
    ]);
  }

  const validation = buildWebCollectorToolValidation(toolFormat);
  const constraints = buildWebCollectorConstraints(mode, language, toolFormat);

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
    buildWebCollectorExample(toolFormat),
    context,
  ]);
};