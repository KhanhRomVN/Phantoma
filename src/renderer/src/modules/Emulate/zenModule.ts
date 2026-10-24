import type { ZenModule } from '@renderer/components/RightPanel/Zen/feature/Chat/services/ModuleRegistry';
import { CAPABILITIES as EMULATE_CAPABILITIES } from './prompts/config';
import { EMULATE_TAG_REGISTRY } from './constants/tag-registry';
import { rendererMapFromGlob } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/zenModuleUtils';
import * as E from './executors/EmulateExecutor';
import * as P from './parsers/EmulateParser';
import { buildPromptForMode as buildEmulatePrompt } from './prompts';
import { EmulateController } from './controller/EmulateController';
import {
  buildTrafficContext,
  buildEmptyTrafficContext,
  buildFilterContext,
  buildEmptyFilterContext,
} from './prompts';

type Exec = ZenModule['executors'][string];

const paramsOnly =
  (fn: any): Exec =>
  async (a) =>
    fn(a.params || {});
const withTarget =
  (fn: any): Exec =>
  async (a, c) =>
    fn(a.params || {}, c.activeTargetId);
const targetOnly =
  (fn: any): Exec =>
  async (_a, c) =>
    fn(c.activeTargetId);

export const emulateModule: ZenModule = {
  tagRegistry: EMULATE_TAG_REGISTRY,
  id: 'emulate',
  services: {
    EmulateController,
    buildTrafficContext,
    buildEmptyTrafficContext,
    buildFilterContext,
    buildEmptyFilterContext,
  },
  executors: {
    list_https: paramsOnly(E.executeListHttps),
    list_hosts: async () => E.executeListHosts(),
    list_sources: paramsOnly(E.executeListSources),
    list_resources: paramsOnly(E.executeListResources),
    get_source_detail: paramsOnly(E.executeGetSourceDetail),
    get_resource_content: paramsOnly(E.executeGetResourceContent),
    get_https_detail: paramsOnly(E.executeGetHttpsDetail),
    apply_filter: paramsOnly(E.executeApplyFilter),
    send_to_repeater: withTarget(E.executeSendToRepeater),
    list_repeaters: targetOnly(E.executeListRepeaters),
    delete_repeater: withTarget(E.executeDeleteRepeater),
    get_repeater_detail: withTarget(E.executeGetRepeaterDetail),
    update_repeater_content: withTarget(E.executeUpdateRepeaterContent),
    run_repeater: withTarget(E.executeRunRepeater),
    list_reports: targetOnly(E.executeListReports),
    create_report: withTarget(E.executeCreateReport),
    read_report: withTarget(E.executeReadReport),
    update_report: withTarget(E.executeUpdateReport),
    list_report_files: withTarget(E.executeListReportFiles),
    create_report_file: withTarget(E.executeCreateReportFile),
    read_report_file: withTarget(E.executeReadReportFile),
    update_report_file: withTarget(E.executeUpdateReportFile),
    delete_report_file: withTarget(E.executeDeleteReportFile),
    execute_command: withTarget(E.executeExecuteCommand),
  },
  parsers: {
    list_https: P.parseListHttps,
    get_https_detail: P.parseGetHttpsDetail,
    list_hosts: P.parseListHosts,
    list_sources: P.parseListSources,
    list_resources: P.parseListResources,
    get_source_detail: P.parseGetSourceDetail,
    get_resource_content: P.parseGetResourceContent,
    apply_filter: P.parseApplyFilter,
    send_to_repeater: P.parseSendToRepeater,
    list_repeaters: P.parseListRepeaters,
    delete_repeater: P.parseDeleteRepeater,
    get_repeater_detail: P.parseGetRepeaterDetail,
    update_repeater_content: P.parseUpdateRepeaterContent,
    run_repeater: P.parseRunRepeater,
    list_reports: P.parseListReports,
    create_report: P.parseCreateReport,
    read_report: P.parseReadReport,
    update_report: P.parseUpdateReport,
    list_report_files: P.parseListReportFiles,
    create_report_file: P.parseCreateReportFile,
    read_report_file: P.parseReadReportFile,
    update_report_file: P.parseUpdateReportFile,
    delete_report_file: P.parseDeleteReportFile,
    execute_command: P.parseExecuteCommand,
  },
  renderers: rendererMapFromGlob(import.meta.glob('./renderers/*Renderer.tsx', { eager: true })),
  prompts: {
    systemPrompts: new Map([
      [
        'emulate',
        {
          getCapabilities: () => EMULATE_CAPABILITIES,
          buildPrompt: buildEmulatePrompt,
        },
      ],
    ]),
  },
};
