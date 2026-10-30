import type { ZenModule } from '@renderer/components/RightPanel/Zen/feature/Chat/services/ModuleRegistry';
import { rendererMapFromGlob } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/zenModuleUtils';
import { EMULATE_TAG_REGISTRY } from './constants/tag-registry';
import { EmulateController } from './EmulateController';
import { CAPABILITIES as EMULATE_CAPABILITIES } from './prompts/emulate/config';
import {
  buildPromptForMode as buildEmulatePrompt,
  buildTrafficContext,
  buildEmptyTrafficContext,
  buildFilterContext,
  buildEmptyFilterContext,
} from './prompts/emulate';
import { executeListHttps } from './executors/ListHttpsExecutor';
import { executeListHosts } from './executors/ListHostsExecutor';
import { executeListSources } from './executors/ListSourcesExecutor';
import { executeListResources } from './executors/ListResourcesExecutor';
import { executeGetSourceDetail } from './executors/GetSourceDetailExecutor';
import { executeGetResourceContent } from './executors/GetResourceContentExecutor';
import { executeGetHttpsDetail } from './executors/GetHttpsDetailExecutor';
import { executeApplyFilter } from './executors/ApplyFilterExecutor';
import { executeSendToRepeater } from './executors/SendToRepeaterExecutor';
import { executeListRepeaters } from './executors/ListRepeatersExecutor';
import { executeDeleteRepeater } from './executors/DeleteRepeaterExecutor';
import { executeGetRepeaterDetail } from './executors/GetRepeaterDetailExecutor';
import { executeUpdateRepeaterContent } from './executors/UpdateRepeaterContentExecutor';
import { executeRunRepeater } from './executors/RunRepeaterExecutor';
import { executeListReports } from './executors/ListReportsExecutor';
import { executeCreateReport } from './executors/CreateReportExecutor';
import { executeReadReport } from './executors/ReadReportExecutor';
import { executeUpdateReport } from './executors/UpdateReportExecutor';
import { parseListHttps } from './parsers/ListHttpsParser';
import { parseGetHttpsDetail } from './parsers/GetHttpsDetailParser';
import { parseListHosts } from './parsers/ListHostsParser';
import { parseListSources } from './parsers/ListSourcesParser';
import { parseListResources } from './parsers/ListResourcesParser';
import { parseGetSourceDetail } from './parsers/GetSourceDetailParser';
import { parseGetResourceContent } from './parsers/GetResourceContentParser';
import { parseApplyFilter } from './parsers/ApplyFilterParser';
import { parseSendToRepeater } from './parsers/SendToRepeaterParser';
import { parseListRepeaters } from './parsers/ListRepeatersParser';
import { parseDeleteRepeater } from './parsers/DeleteRepeaterParser';
import { parseGetRepeaterDetail } from './parsers/GetRepeaterDetailParser';
import { parseUpdateRepeaterContent } from './parsers/UpdateRepeaterContentParser';
import { parseRunRepeater } from './parsers/RunRepeaterParser';
import { parseListReports } from './parsers/ListReportsParser';
import { parseCreateReport } from './parsers/CreateReportParser';
import { parseReadReport } from './parsers/ReadReportParser';
import { parseUpdateReport } from './parsers/UpdateReportParser';

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
    list_https: async (a) => executeListHttps(a.params || {}),
    list_hosts: async () => executeListHosts(),
    list_sources: async (a) => executeListSources(a.params || {}),
    list_resources: async (a) => executeListResources(a.params || {}),
    get_source_detail: async (a) => executeGetSourceDetail(a.params || {}),
    get_resource_content: async (a) => executeGetResourceContent(a.params || {}),
    get_https_detail: async (a) => executeGetHttpsDetail(a.params || {}),
    apply_filter: async (a) => executeApplyFilter(a.params || {}),
    send_to_repeater: async (a, c) => executeSendToRepeater(a.params || {}, c.activeTargetId),
    list_repeaters: async (_a, c) => executeListRepeaters(c.activeTargetId),
    delete_repeater: async (a, c) => executeDeleteRepeater(a.params || {}, c.activeTargetId),
    get_repeater_detail: async (a, c) =>
      executeGetRepeaterDetail(a.params || {}, c.activeTargetId),
    update_repeater_content: async (a, c) =>
      executeUpdateRepeaterContent(a.params || {}, c.activeTargetId),
    run_repeater: async (a, c) => executeRunRepeater(a.params || {}, c.activeTargetId),
    list_reports: async (_a, c) => executeListReports(c.activeTargetId),
    create_report: async (a, c) => executeCreateReport(a.params || {}, c.activeTargetId),
    read_report: async (a, c) => executeReadReport(a.params || {}, c.activeTargetId),
    update_report: async (a, c) => executeUpdateReport(a.params || {}, c.activeTargetId),
  },
  parsers: {
    list_https: parseListHttps,
    get_https_detail: parseGetHttpsDetail,
    list_hosts: parseListHosts,
    list_sources: parseListSources,
    list_resources: parseListResources,
    get_source_detail: parseGetSourceDetail,
    get_resource_content: parseGetResourceContent,
    apply_filter: parseApplyFilter,
    send_to_repeater: parseSendToRepeater,
    list_repeaters: parseListRepeaters,
    delete_repeater: parseDeleteRepeater,
    get_repeater_detail: parseGetRepeaterDetail,
    update_repeater_content: parseUpdateRepeaterContent,
    run_repeater: parseRunRepeater,
    list_reports: parseListReports,
    create_report: parseCreateReport,
    read_report: parseReadReport,
    update_report: parseUpdateReport,
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