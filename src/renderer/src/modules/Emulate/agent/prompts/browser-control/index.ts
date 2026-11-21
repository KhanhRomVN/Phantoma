import type { WorkflowAgentPromptConfig } from './types';
import { joinSections } from './types';
import { buildBrowserControlToolValidation } from './tool-validation';
import { buildBrowserControlToolsReference } from './tools-reference';
import { buildBrowserControlExample } from './example';
import { buildBrowserControlIdentity } from './identity';
import { buildBrowserControlWorkflow } from './workflow';
import { buildBrowserControlConstraints, buildBrowserControlCoreRules } from './constraints';
import { buildBrowserControlSystemContext } from './system-context';
import { buildSubAgentMessaging } from './messaging';

export { buildBrowserControlIdentity } from './identity';
export { buildBrowserControlWorkflow, RESULT_FORMAT } from './workflow';
export { buildBrowserControlConstraints, buildBrowserControlCoreRules } from './constraints';
export { buildBrowserControlSystemContext } from './system-context';
export { buildBrowserControlToolValidation } from './tool-validation';
export { BROWSER_CONTROL_TOOLS, buildBrowserControlToolsReference } from './tools-reference';
export { buildBrowserControlExample } from './example';

export const buildBrowserControlPrompt = (config: WorkflowAgentPromptConfig): string => {
  const {
    language,
    systemInfo,
    promptLengthMode = 'long',
    toolFormat = 'xml',
    mode = 'balanced',
  } = config;

  if (promptLengthMode === 'none') return '';

  const tools = buildBrowserControlToolsReference(toolFormat);
  const identity = buildBrowserControlIdentity(language, toolFormat);
  const workflow = buildBrowserControlWorkflow(mode);
  const context = buildBrowserControlSystemContext(systemInfo);
  const messaging = buildSubAgentMessaging('emulate_browser', toolFormat, 'RESULT|QUESTION');

  if (promptLengthMode === 'short') {
    return joinSections([
      identity,
      buildBrowserControlCoreRules(language, toolFormat),
      workflow,
      tools,
      context,
    ]);
  }

  const validation = buildBrowserControlToolValidation(toolFormat);
  const constraints = buildBrowserControlConstraints(mode, language, toolFormat);

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
    buildBrowserControlExample(toolFormat),
    context,
  ]);
};