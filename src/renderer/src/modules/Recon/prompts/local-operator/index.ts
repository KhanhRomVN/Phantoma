import type { WorkflowAgentPromptConfig } from '../types';
import { joinSections } from '../types';
import { buildLocalOperatorToolValidation } from './tool-validation';
import { buildLocalOperatorToolsReference } from './tools-reference';
import { buildLocalOperatorExample } from './example';
import { buildLocalOperatorIdentity } from './identity';
import { buildLocalOperatorWorkflow } from './workflow';
import { buildLocalOperatorConstraints, buildLocalOperatorCoreRules } from './constraints';
import { buildLocalOperatorSystemContext } from './system-context';
import { buildSubAgentMessaging } from '../messaging';

export { buildLocalOperatorIdentity } from './identity';
export { buildLocalOperatorWorkflow, RESULT_FORMAT } from './workflow';
export { buildLocalOperatorConstraints, buildLocalOperatorCoreRules } from './constraints';
export { buildLocalOperatorSystemContext } from './system-context';
export { buildLocalOperatorToolValidation } from './tool-validation';
export { LOCAL_OPERATOR_TOOLS, buildLocalOperatorToolsReference } from './tools-reference';
export { buildLocalOperatorExample } from './example';

export const buildLocalOperatorPrompt = (config: WorkflowAgentPromptConfig): string => {
  const {
    language,
    systemInfo,
    promptLengthMode = 'long',
    toolFormat = 'xml',
    mode = 'balanced',
  } = config;

  if (promptLengthMode === 'none') return '';

  const tools = buildLocalOperatorToolsReference(toolFormat);
  const identity = buildLocalOperatorIdentity(language, toolFormat);
  const workflow = buildLocalOperatorWorkflow(mode);
  const context = buildLocalOperatorSystemContext(systemInfo);
  const messaging = buildSubAgentMessaging('recon_local', toolFormat, 'RESULT|QUESTION');

  if (promptLengthMode === 'short') {
    return joinSections([
      identity,
      buildLocalOperatorCoreRules(language, toolFormat),
      workflow,
      tools,
      context,
    ]);
  }

  const validation = buildLocalOperatorToolValidation(toolFormat);
  const constraints = buildLocalOperatorConstraints(mode, language, toolFormat);

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
    buildLocalOperatorExample(toolFormat),
    context,
  ]);
};