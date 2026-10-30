import type { WorkflowAgentPromptConfig } from '../types';
import { joinSections } from '../types';
import { buildSynthesizerToolValidation } from './tool-validation';
import { buildSynthesizerToolsReference } from './tools-reference';
import { buildSynthesizerExample } from './example';
import { buildSynthesizerIdentity } from './identity';
import { buildSynthesizerWorkflow } from './workflow';
import { buildSynthesizerConstraints, buildSynthesizerCoreRules } from './constraints';
import { buildSynthesizerSystemContext } from './system-context';
import { buildSubAgentMessaging } from '../messaging';

export { buildSynthesizerIdentity } from './identity';
export { buildSynthesizerWorkflow, RESULT_FORMAT } from './workflow';
export { buildSynthesizerConstraints, buildSynthesizerCoreRules } from './constraints';
export { buildSynthesizerSystemContext } from './system-context';
export { buildSynthesizerToolValidation } from './tool-validation';
export { SYNTHESIZER_TOOLS, buildSynthesizerToolsReference } from './tools-reference';
export { buildSynthesizerExample } from './example';

export const buildSynthesizerPrompt = (config: WorkflowAgentPromptConfig): string => {
  const {
    language,
    systemInfo,
    promptLengthMode = 'long',
    toolFormat = 'xml',
    mode = 'balanced',
  } = config;

  if (promptLengthMode === 'none') return '';

  const tools = buildSynthesizerToolsReference(toolFormat);
  const identity = buildSynthesizerIdentity(language, toolFormat);
  const workflow = buildSynthesizerWorkflow(mode);
  const context = buildSynthesizerSystemContext(systemInfo);
  const messaging = buildSubAgentMessaging('recon_synthesizer', toolFormat, 'RESULT|QUESTION');

  if (promptLengthMode === 'short') {
    return joinSections([
      identity,
      buildSynthesizerCoreRules(language, toolFormat),
      workflow,
      tools,
      context,
    ]);
  }

  const validation = buildSynthesizerToolValidation(toolFormat);
  const constraints = buildSynthesizerConstraints(mode, language, toolFormat);

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
    buildSynthesizerExample(toolFormat),
    context,
  ]);
};