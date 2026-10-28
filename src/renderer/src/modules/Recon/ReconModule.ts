import type { ZenModule } from '@renderer/components/RightPanel/Zen/feature/Chat/services/ModuleRegistry';
import { RECON_TAG_REGISTRY } from './constants/tag-registry';
import { rendererMapFromGlob } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/zenModuleUtils';
import * as R from './executors/ReconExecutor';
import * as P from './parsers/ReconParser';
import {
  buildOrchestratorPrompt,
  buildPlannerPrompt,
  buildWebCollectorPrompt,
  buildLocalOperatorPrompt,
  buildVerifierPrompt,
  buildSynthesizerPrompt,
} from './prompts';
import { CAPABILITIES as RECON_ORCHESTRATOR_CAPABILITIES } from './prompts/orchestrator/config';
import { CAPABILITIES as RECON_PLANNER_CAPABILITIES } from './prompts/planner/config';
import { CAPABILITIES as RECON_WEB_CAPABILITIES } from './prompts/web-collector/config';
import { CAPABILITIES as RECON_LOCAL_CAPABILITIES } from './prompts/local-operator/config';
import { CAPABILITIES as RECON_VERIFIER_CAPABILITIES } from './prompts/verifier/config';
import { CAPABILITIES as RECON_SYNTH_CAPABILITIES } from './prompts/synthesizer/config';

const unwrap =
  (fn: any): ZenModule['executors'][string] =>
  async (a) => {
    const r = await fn(a.params || {});
    return r.success ? r.output || null : r.error || null;
  };

const executorFns: Record<string, any> = {
  list_tabs: R.executeListTabs,
  create_tab: R.executeCreateTab,
  close_tab: R.executeCloseTab,
  switch_tab: R.executeSwitchTab,
  navigate: R.executeNavigate,
  back: R.executeBack,
  forward: R.executeForward,
  reload: R.executeReload,
  get_page_content: R.executeGetPageContent,
  list_elements: R.executeListElements,
  click_element: R.executeClickElement,
  fill_input: R.executeFillInput,
  press_key: R.executePressKey,
  scroll: R.executeScroll,
  capture_screenshot: R.executeCaptureScreenshot,
  select_option: R.executeSelectOption,
  wait_for: R.executeWaitFor,
  scroll_to_element: R.executeScrollToElement,
  list_frames: R.executeListFrames,
  hover: R.executeHover,
  clear_input: R.executeClearInput,
  upload_file: R.executeUploadFile,
  evaluate_js: R.executeEvaluateJs,
};

const parserFns: Record<string, any> = {
  list_tabs: P.parseListTabs,
  create_tab: P.parseCreateTab,
  close_tab: P.parseCloseTab,
  switch_tab: P.parseSwitchTab,
  navigate: P.parseNavigate,
  back: P.parseBack,
  forward: P.parseForward,
  reload: P.parseReload,
  get_page_content: P.parseGetPageContent,
  list_elements: P.parseListElements,
  click_element: P.parseClickElement,
  fill_input: P.parseFillInput,
  press_key: P.parsePressKey,
  scroll: P.parseScroll,
  capture_screenshot: P.parseCaptureScreenshot,
  select_option: P.parseSelectOption,
  wait_for: P.parseWaitFor,
  scroll_to_element: P.parseScrollToElement,
  list_frames: P.parseListFrames,
  hover: P.parseHover,
  clear_input: P.parseClearInput,
  upload_file: P.parseUploadFile,
  evaluate_js: P.parseEvaluateJs,
};

export const reconModule: ZenModule = {
  tagRegistry: RECON_TAG_REGISTRY,
  id: 'recon',
  services: {
    getLastScreenshotFileId: R.getLastScreenshotFileId,
    clearLastScreenshotFileId: R.clearLastScreenshotFileId,
  },
  executors: Object.fromEntries(Object.entries(executorFns).map(([k, fn]) => [k, unwrap(fn)])),
  parsers: Object.fromEntries(
    Object.entries(parserFns).map(([k, fn]) => [k, (inner: string) => fn(inner) || {}]),
  ),
  renderers: rendererMapFromGlob(import.meta.glob('./renderers/*Renderer.tsx', { eager: true })),
  prompts: {
    systemPrompts: new Map([

      [
        'orchestrator',
        {
          getCapabilities: () => RECON_ORCHESTRATOR_CAPABILITIES,
          buildPrompt: buildOrchestratorPrompt,
        },
      ],
      [
        'recon_planner',
        {
          getCapabilities: () => RECON_PLANNER_CAPABILITIES,
          buildPrompt: buildPlannerPrompt,
        },
      ],
      [
        'recon_web',
        {
          getCapabilities: () => RECON_WEB_CAPABILITIES,
          buildPrompt: buildWebCollectorPrompt,
        },
      ],
      [
        'recon_local',
        {
          getCapabilities: () => RECON_LOCAL_CAPABILITIES,
          buildPrompt: buildLocalOperatorPrompt,
        },
      ],
      [
        'recon_verifier',
        {
          getCapabilities: () => RECON_VERIFIER_CAPABILITIES,
          buildPrompt: buildVerifierPrompt,
        },
      ],
      [
        'recon_synthesizer',
        {
          getCapabilities: () => RECON_SYNTH_CAPABILITIES,
          buildPrompt: buildSynthesizerPrompt,
        },
      ],
    ]),
  },
};
