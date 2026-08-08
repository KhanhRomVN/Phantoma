/**
 * EmulateController — Singleton controller điều phối các handler cho Emulate module.
 *
 * ?Usage:
 *   // Từ Emulate component: cập nhật requests
 *   EmulateController.getInstance().setRequests(requests);
 *
 *   // Từ tool-executors (qua static executeTool):
 *   const result = await EmulateController.executeTool('list_https', { filter: {...}, limit: 50 });
 */
import {
  ListHttpHandler, ListHttpFilter, ListHttpResult,
} from '../modules/Emulate/handler/ListHttpHandler';
import { ListHostsHandler } from '../modules/Emulate/handler/ListHostsHandler';
import { ListSourcesHandler, ListSourcesFilter } from '../modules/Emulate/handler/ListSourcesHandler';
import { GetSourceDetailHandler } from '../modules/Emulate/handler/GetSourceDetailHandler';
import { GetHttpsDetailHandler } from '../modules/Emulate/handler/GetHttpsDetailHandler';
import { GetTrafficSummaryHandler } from '../modules/Emulate/handler/GetTrafficSummaryHandler';
import { GetFilterHandler } from '../modules/Emulate/handler/GetFilterHandler';
import { ApplyFilterHandler } from '../modules/Emulate/handler/ApplyFilterHandler';
import { NetworkRequest } from '../modules/Emulate/types/inspector';
import { InspectorFilter } from '../modules/Emulate/types/filter.types';
import type { ApplyFilterParams } from '../components/RightPanel/Agent/feature/Chat/services/parsers/emulate/ApplyFilterParser';
import type { TrafficSummary } from '../components/RightPanel/Agent/feature/Chat/prompts/emulate';
import { filterRequestsByConfig } from '@renderer/modules/Emulate/hooks/network/useRequestFilter';
import { CdpScriptUnpackedData } from '@renderer/stores/networkStore';

export class EmulateController {
  private static instance: EmulateController;

  private requests: NetworkRequest[] = [];
  private unpackedScripts: Map<string, CdpScriptUnpackedData> | undefined;
  private filter: InspectorFilter | undefined;
  private onFilterChanged: ((filter: InspectorFilter) => void) | null = null;

  private listHttpHandler: ListHttpHandler;
  private listHostsHandler: ListHostsHandler;
  private listSourcesHandler: ListSourcesHandler;
  private getSourceDetailHandler: GetSourceDetailHandler;
  private getHttpsDetailHandler: GetHttpsDetailHandler;
  private getTrafficSummaryHandler: GetTrafficSummaryHandler;
  private getFilterHandler: GetFilterHandler;
  private applyFilterHandler: ApplyFilterHandler;

  private constructor() {
    this.listHttpHandler = new ListHttpHandler();
    this.listHostsHandler = new ListHostsHandler();
    this.listSourcesHandler = new ListSourcesHandler();
    this.getSourceDetailHandler = new GetSourceDetailHandler();
    this.getHttpsDetailHandler = new GetHttpsDetailHandler();
    this.getTrafficSummaryHandler = new GetTrafficSummaryHandler();
    this.getFilterHandler = new GetFilterHandler();
    this.applyFilterHandler = new ApplyFilterHandler();
  }

  // ── Singleton ─────────────────────────────────────────────────────

  public static getInstance(): EmulateController {
    if (!EmulateController.instance) {
      EmulateController.instance = new EmulateController();
    }
    return EmulateController.instance;
  }

  // ── Static: execute tool (giống CodeController pattern) ──────────

  /** Thực thi emulate tool, trả về Promise. Dùng bởi tool-executors/emulate. */
  public static async executeTool(
    toolName: string,
    params: Record<string, any> = {},
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const ctrl = EmulateController.getInstance();

    try {
      switch (toolName) {
        case 'list_https': {
          const text = ctrl.listHttpsText(params.filter || {}, params.limit || 50);
          return { success: true, data: { output: text } };
        }
        case 'list_hosts': {
          return { success: true, data: { output: ctrl.listHostsText() } };
        }
        case 'list_sources': {
          return { success: true, data: { output: ctrl.listSourcesText(params.filter || {}) } };
        }
        case 'get_source_detail': {
          if (params.index === undefined) return { success: false, error: 'index is required' };
          return { success: true, data: { output: ctrl.getSourceDetailText(params.index) } };
        }
        case 'get_https_detail': {
          if (params.index === undefined) return { success: false, error: 'index is required' };
          return { success: true, data: { output: ctrl.getHttpsDetailText(params.index) } };
        }
        case 'apply_filter': {
          const currentFilter = ctrl.getFilter();
          if (!currentFilter) return { success: false, error: 'No current filter to modify' };
          ctrl.applyFilterChanges(params as any);

          const changes: string[] = [];
          if (params.methods) changes.push('Methods: ' + params.methods.map((m: any) => m.value + '(' + m.action + ')').join(', '));
          if (params.statuses) changes.push('Statuses: ' + params.statuses.map((s: any) => s.value + '(' + s.action + ')').join(', '));
          if (params.types) changes.push('Types: ' + params.types.map((t: any) => t.value + '(' + t.action + ')').join(', '));
          if (params.hosts) changes.push('Hosts: ' + params.hosts.map((h: any) => h.value + '(' + h.action + ')').join(', '));
          if (params.paths) changes.push('Paths: ' + params.paths.map((p: any) => p.value + '(' + p.action + ')').join(', '));
          if (params.size) changes.push('Size: ' + (params.size.min || '0') + '-' + (params.size.max || 'inf'));
          if (params.time) changes.push('Time: ' + (params.time.min || '0') + '-' + (params.time.max || 'inf'));

          return { success: true, data: { output: '[apply_filter] Applied: ' + (changes.join('; ') || 'no changes') } };
        }
        default:
          return { success: false, error: 'Unknown emulate tool: ' + toolName };
      }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  // ── Instance methods ──────────────────────────────────────────────

  public setRequests(requests: NetworkRequest[]): void { this.requests = requests; }
  public setUnpackedScripts(scripts: Map<string, CdpScriptUnpackedData> | undefined): void { this.unpackedScripts = scripts; }

  public listHttps(filter: ListHttpFilter = {}, limit: number = 50): ListHttpResult {
    let requests = this.requests;
    if (this.filter) requests = filterRequestsByConfig(requests, this.filter, '');
    return this.listHttpHandler.handle(requests, filter, limit);
  }
  public listHttpsText(filter: ListHttpFilter = {}, limit: number = 50): string { return this.listHttps(filter, limit).text; }
  public listHostsText(): string { return this.listHostsHandler.handle(this.requests).text; }
  public listSourcesText(filter: ListSourcesFilter = {}): string { return this.listSourcesHandler.handle(this.requests, filter).text; }
  public getSourceDetailText(index: number): string { return this.getSourceDetailHandler.handle(this.requests, this.unpackedScripts, index).text; }
  public getHttpsDetailText(index: number): string { return this.getHttpsDetailHandler.handle(this.requests, index).text; }
  public getTrafficSummary(): TrafficSummary { return this.getTrafficSummaryHandler.handle(this.requests); }
  public setFilter(filter: InspectorFilter): void { this.filter = filter; }
  public getFilter(): InspectorFilter | undefined { return this.filter; }
  public getFilterText(): string {
    if (!this.filter) return this.getFilterHandler.handle({} as InspectorFilter, this.requests);
    return this.getFilterHandler.handle(this.filter, this.requests);
  }
  public setOnFilterChanged(cb: ((filter: InspectorFilter) => void) | null): void { this.onFilterChanged = cb; }
  public applyFilterChanges(params: ApplyFilterParams): InspectorFilter {
    const current = this.filter || ({} as InspectorFilter);
    const updated = this.applyFilterHandler.apply(current, params);
    this.filter = updated;
    if (this.onFilterChanged) this.onFilterChanged(updated);
    return updated;
  }
}