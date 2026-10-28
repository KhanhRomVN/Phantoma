import type { WorkflowAgentPromptConfig } from '../types';
import { joinSections } from '../types';
import { buildVerifierToolValidation } from './tool-validation';
import { buildVerifierToolsReference } from './tools-reference';
import { buildVerifierExample } from './example';
import { buildVerifierIdentity } from './identity';
import { buildVerifierWorkflow } from './workflow';
import { buildVerifierConstraints, buildVerifierCoreRules } from './constraints';
import { buildVerifierSystemContext } from './system-context';
import { buildSubAgentMessaging } from '../messaging';

export { buildVerifierIdentity } from './identity';
export { buildVerifierWorkflow, REVIEW_FORMAT } from './workflow';
export { buildVerifierConstraints, buildVerifierCoreRules } from './constraints';
export { buildVerifierSystemContext } from './system-context';
export { buildVerifierToolValidation } from './tool-validation';
export { VERIFIER_TOOLS, buildVerifierToolsReference } from './tools-reference';
export { buildVerifierExample } from './example';

export const buildVerifierPrompt = (config: WorkflowAgentPromptConfig): string => {
  const {
    language,
    systemInfo,
    promptLengthMode = 'long',
    toolFormat = 'xml',
    mode = 'balanced',
  } = config;

  if (promptLengthMode === 'none') return '';

  const tools = buildVerifierToolsReference(toolFormat);
  const identity = buildVerifierIdentity(language, toolFormat);
  const workflow = buildVerifierWorkflow(mode);
  const context = buildVerifierSystemContext(systemInfo);
  const messaging = buildSubAgentMessaging('recon_verifier', toolFormat, 'REVIEW|QUESTION');

  if (promptLengthMode === 'short') {
    return joinSections([
      identity,
      buildVerifierCoreRules(language, toolFormat),
      workflow,
      tools,
      context,
    ]);
  }

  const validation = buildVerifierToolValidation(toolFormat);
  const constraints = buildVerifierConstraints(mode, language, toolFormat);

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
    buildVerifierExample(toolFormat),
    context,
  ]);
};