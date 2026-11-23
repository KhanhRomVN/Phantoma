import type { ZenModule } from '@renderer/components/Widgets/Zen/screens/Chat/services/moduleRegistry';
import { rendererMapFromGlob } from '@renderer/components/Widgets/Zen/screens/Chat/utils/renderer-helpers';
import { EMULATE_TAG_REGISTRY } from './agent/tag-registry';
import {
  getTrafficSummary,
  getCurrentFilter,
  getFilterText,
} from './agent/services/emulate-context.service';
import {
  CAPABILITIES as EMULATE_CAPABILITIES,
  ANALYZER_CAPABILITIES as EMULATE_ANALYZER_CAPABILITIES,
} from './agent/prompts/analyzer/config';
import { CAPABILITIES as EMULATE_ORCHESTRATOR_CAPABILITIES } from './agent/prompts/orchestrator/config';
import { CAPABILITIES as EMULATE_PLANNER_CAPABILITIES } from './agent/prompts/planner/config';
import { CAPABILITIES as EMULATE_BROWSER_CAPABILITIES } from './agent/prompts/browser-control/config';
import { CAPABILITIES as EMULATE_CLI_CAPABILITIES } from './agent/prompts/local-operator/config';
import { buildOrchestratorPrompt } from './agent/prompts/orchestrator';
import { buildPlannerPrompt } from './agent/prompts/planner';
import { buildBrowserControlPrompt } from './agent/prompts/browser-control';
import { buildCliToolPrompt } from './agent/prompts/local-operator';
import {
  buildAnalyzerPrompt,
  buildPromptForMode as buildEmulatePrompt,
  buildTrafficContext,
  buildEmptyTrafficContext,
  buildFilterContext,
  buildEmptyFilterContext,
} from './agent/prompts/analyzer';
import { emulateExecutors, emulateParsers, emulateRendererModules } from './agent/tools/registry';

export const emulateModule: ZenModule = {
  tagRegistry: EMULATE_TAG_REGISTRY,
  id: 'emulate',
  capabilities: {
    multiAgent: true,
  },
  services: {
    getTrafficSummary,
    getCurrentFilter,
    getFilterText,
    buildTrafficContext,
    buildEmptyTrafficContext,
    buildFilterContext,
    buildEmptyFilterContext,
  },
  executors: emulateExecutors,
  parsers: emulateParsers,
  renderers: rendererMapFromGlob(emulateRendererModules),
  prompts: {
    systemPrompts: new Map([
      [
        'emulate',
        {
          getCapabilities: () => EMULATE_CAPABILITIES,
          buildPrompt: buildEmulatePrompt,
        },
      ],
      [
        'orchestrator',
        {
          getCapabilities: () => EMULATE_ORCHESTRATOR_CAPABILITIES,
          buildPrompt: buildOrchestratorPrompt,
        },
      ],
      [
        'emulate_planner',
        {
          getCapabilities: () => EMULATE_PLANNER_CAPABILITIES,
          buildPrompt: buildPlannerPrompt,
        },
      ],
      [
        'emulate_browser',
        {
          getCapabilities: () => EMULATE_BROWSER_CAPABILITIES,
          buildPrompt: buildBrowserControlPrompt,
        },
      ],
      [
        'emulate_cli',
        {
          getCapabilities: () => EMULATE_CLI_CAPABILITIES,
          buildPrompt: buildCliToolPrompt,
        },
      ],
      [
        'emulate_analyzer',
        {
          getCapabilities: () => EMULATE_ANALYZER_CAPABILITIES,
          buildPrompt: buildAnalyzerPrompt,
        },
      ],
    ]),
  },
};
