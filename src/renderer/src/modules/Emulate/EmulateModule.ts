import type { ZenModule } from '@renderer/components/Widgets/Zen/screens/Chat/services/moduleRegistry';
import { rendererMapFromGlob } from '@renderer/components/Widgets/Zen/screens/Chat/utils/renderer-helpers';
import { EMULATE_TAG_REGISTRY } from './constants/tag-registry';
import {
  getTrafficSummary,
  getCurrentFilter,
  getFilterText,
} from './services/emulate-context.service';
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
import { executeSendToFuzzer } from './executors/SendToFuzzerExecutor';
import { executeListFuzzers } from './executors/ListFuzzersExecutor';
import { executeDeleteFuzzer } from './executors/DeleteFuzzerExecutor';
import { executeGetFuzzerDetail } from './executors/GetFuzzerDetailExecutor';
import { executeUpdateFuzzerContent } from './executors/UpdateFuzzerContentExecutor';
import { executeRunFuzzer } from './executors/RunFuzzerExecutor';
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
import { parseSendToFuzzer } from './parsers/SendToFuzzerParser';
import { parseListFuzzers } from './parsers/ListFuzzersParser';
import { parseDeleteFuzzer } from './parsers/DeleteFuzzerParser';
import { parseGetFuzzerDetail } from './parsers/GetFuzzerDetailParser';
import { parseUpdateFuzzerContent } from './parsers/UpdateFuzzerContentParser';
import { parseRunFuzzer } from './parsers/RunFuzzerParser';
import { parseListReports } from './parsers/ListReportsParser';
import { parseCreateReport } from './parsers/CreateReportParser';
import { parseReadReport } from './parsers/ReadReportParser';
import { parseUpdateReport } from './parsers/UpdateReportParser';

export const emulateModule: ZenModule = {
  tagRegistry: EMULATE_TAG_REGISTRY,
  id: 'emulate',
  services: {
    getTrafficSummary,
    getCurrentFilter,
    getFilterText,
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
    send_to_fuzzer: async (a, c) => executeSendToFuzzer(a.params || {}, c.activeTargetId),
    list_fuzzers: async (_a, c) => executeListFuzzers(c.activeTargetId),
    delete_fuzzer: async (a, c) => executeDeleteFuzzer(a.params || {}, c.activeTargetId),
    get_fuzzer_detail: async (a, c) => executeGetFuzzerDetail(a.params || {}, c.activeTargetId),
    update_fuzzer_content: async (a, c) =>
      executeUpdateFuzzerContent(a.params || {}, c.activeTargetId),
    run_fuzzer: async (a, c) => executeRunFuzzer(a.params || {}, c.activeTargetId),
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
    send_to_fuzzer: parseSendToFuzzer,
    list_fuzzers: parseListFuzzers,
    delete_fuzzer: parseDeleteFuzzer,
    get_fuzzer_detail: parseGetFuzzerDetail,
    update_fuzzer_content: parseUpdateFuzzerContent,
    run_fuzzer: parseRunFuzzer,
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
