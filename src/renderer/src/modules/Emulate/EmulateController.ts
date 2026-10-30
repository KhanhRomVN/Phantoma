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
  ListHttpHandler,
  ListHttpFilter,
  ListHttpResult,
} from './handler/ListHttpHandler';
import { ListHostsHandler } from './handler/ListHostsHandler';
import {
  ListSourcesHandler,
  ListSourcesFilter,
} from './handler/ListSourcesHandler';
import {
  ListResourcesHandler,
  ListResourcesFilter,
} from './handler/ListResourcesHandler';
import { GetSourceDetailHandler } from './handler/GetSourceDetailHandler';
import { GetHttpsDetailHandler } from './handler/GetHttpsDetailHandler';
import {
  GetResourceContentHandler,
  GetResourceContentOptions,
} from './handler/GetResourceContentHandler';
import { GetTrafficSummaryHandler } from './handler/GetTrafficSummaryHandler';
import { GetFilterHandler } from './handler/GetFilterHandler';
import { ApplyFilterHandler } from './handler/ApplyFilterHandler';
import { NetworkRequest } from './types/inspector';
import { InspectorFilter } from './types/filter.types';
import type { ApplyFilterParams } from './parsers/ApplyFilterParser';
import type { TrafficSummary } from './prompts/emulate';
import { filterRequestsByConfig } from '@renderer/modules/Emulate/hooks/useRequestFilter';
import { SendToRepeaterHandler } from './handler/SendToRepeaterHandler';
import { ListRepeatersHandler } from './handler/ListRepeatersHandler';
import { DeleteRepeaterHandler } from './handler/DeleteRepeaterHandler';
import { GetRepeaterDetailHandler } from './handler/GetRepeaterDetailHandler';
import { UpdateRepeaterContentHandler } from './handler/UpdateRepeaterContentHandler';
import { RunRepeaterHandler } from './handler/RunRepeaterHandler';
import { ListReportsHandler } from './handler/ListReportsHandler';
import { CreateReportHandler } from './handler/CreateReportHandler';
import { ReadReportHandler } from './handler/ReadReportHandler';
import { UpdateReportHandler } from './handler/UpdateReportHandler';
import type { CdpScriptUnpackedData } from '@renderer/shared/types/network';

export class EmulateController {
  private static instance: EmulateController;

  private requests: NetworkRequest[] = [];
  private unpackedScripts: Map<string, CdpScriptUnpackedData> | undefined;
  private filter: InspectorFilter | undefined;
  private onFilterChanged: ((filter: InspectorFilter) => void) | null = null;
  private targetId: string | null = null;

  private listHttpHandler: ListHttpHandler;
  private listHostsHandler: ListHostsHandler;
  private listSourcesHandler: ListSourcesHandler;
  private listResourcesHandler: ListResourcesHandler;
  private getSourceDetailHandler: GetSourceDetailHandler;
  private getHttpsDetailHandler: GetHttpsDetailHandler;
  private getResourceContentHandler: GetResourceContentHandler;
  private getTrafficSummaryHandler: GetTrafficSummaryHandler;
  private getFilterHandler: GetFilterHandler;
  private applyFilterHandler: ApplyFilterHandler;
  private sendToRepeaterHandler: SendToRepeaterHandler;
  private listRepeatersHandler: ListRepeatersHandler;
  private deleteRepeaterHandler: DeleteRepeaterHandler;
  private getRepeaterDetailHandler: GetRepeaterDetailHandler;
  private updateRepeaterContentHandler: UpdateRepeaterContentHandler;
  private runRepeaterHandler: RunRepeaterHandler;
  private listReportsHandler: ListReportsHandler;
  private createReportHandler: CreateReportHandler;
  private readReportHandler: ReadReportHandler;
  private updateReportHandler: UpdateReportHandler;

  private constructor() {
    this.listHttpHandler = new ListHttpHandler();
    this.listHostsHandler = new ListHostsHandler();
    this.listSourcesHandler = new ListSourcesHandler();
    this.listResourcesHandler = new ListResourcesHandler();
    this.getSourceDetailHandler = new GetSourceDetailHandler();
    this.getHttpsDetailHandler = new GetHttpsDetailHandler();
    this.getResourceContentHandler = new GetResourceContentHandler();
    this.getTrafficSummaryHandler = new GetTrafficSummaryHandler();
    this.getFilterHandler = new GetFilterHandler();
    this.applyFilterHandler = new ApplyFilterHandler();
    this.sendToRepeaterHandler = new SendToRepeaterHandler();
    this.listRepeatersHandler = new ListRepeatersHandler();
    this.deleteRepeaterHandler = new DeleteRepeaterHandler();
    this.getRepeaterDetailHandler = new GetRepeaterDetailHandler();
    this.updateRepeaterContentHandler = new UpdateRepeaterContentHandler();
    this.runRepeaterHandler = new RunRepeaterHandler();
    this.listReportsHandler = new ListReportsHandler();
    this.createReportHandler = new CreateReportHandler();
    this.readReportHandler = new ReadReportHandler();
    this.updateReportHandler = new UpdateReportHandler();
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
    contextTargetId?: string | null,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const ctrl = EmulateController.getInstance();

    // Fallback to contextTargetId if controller targetId is not set
    const effectiveTargetId = ctrl.targetId || contextTargetId || null;

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
        case 'list_resources': {
          return { success: true, data: { output: ctrl.listResourcesText(params.filter || {}) } };
        }
        case 'get_source_detail': {
          if (!params.filepath) return { success: false, error: 'filepath is required' };
          return { success: true, data: { output: ctrl.getSourceDetailText(params.filepath) } };
        }
        case 'get_https_detail': {
          if (params.index === undefined) return { success: false, error: 'index is required' };
          return { success: true, data: { output: ctrl.getHttpsDetailText(params.index) } };
        }
        case 'get_resource_content': {
          if (!params.filename) return { success: false, error: 'filename is required' };
          const options: GetResourceContentOptions = {};
          if (params.start_line !== undefined) options.startLine = params.start_line;
          if (params.end_line !== undefined) options.endLine = params.end_line;
          return {
            success: true,
            data: { output: ctrl.getResourceContentText(params.filename, options) },
          };
        }
        case 'apply_filter': {
          const currentFilter = ctrl.getFilter();
          if (!currentFilter) return { success: false, error: 'No current filter to modify' };
          ctrl.applyFilterChanges(params as any);

          const changes: string[] = [];
          if (params.methods)
            changes.push(
              'Methods: ' +
                params.methods.map((m: any) => m.value + '(' + m.action + ')').join(', '),
            );
          if (params.statuses)
            changes.push(
              'Statuses: ' +
                params.statuses.map((s: any) => s.value + '(' + s.action + ')').join(', '),
            );
          if (params.types)
            changes.push(
              'Types: ' + params.types.map((t: any) => t.value + '(' + t.action + ')').join(', '),
            );
          if (params.hosts)
            changes.push(
              'Hosts: ' + params.hosts.map((h: any) => h.value + '(' + h.action + ')').join(', '),
            );
          if (params.paths)
            changes.push(
              'Paths: ' + params.paths.map((p: any) => p.value + '(' + p.action + ')').join(', '),
            );
          if (params.size)
            changes.push('Size: ' + (params.size.min || '0') + '-' + (params.size.max || 'inf'));
          if (params.time)
            changes.push('Time: ' + (params.time.min || '0') + '-' + (params.time.max || 'inf'));

          return {
            success: true,
            data: { output: '[apply_filter] Applied: ' + (changes.join('; ') || 'no changes') },
          };
        }
        case 'send_to_repeater': {
          if (params.index === undefined) return { success: false, error: 'index is required' };
          const result = await ctrl.sendToRepeaterHandler.handle(
            ctrl.requests,
            params.index,
            effectiveTargetId,
          );
          return { success: true, data: { output: result.text } };
        }
        case 'list_repeaters': {
          const listResult = await ctrl.listRepeatersHandler.handle(
            ctrl.requests,
            effectiveTargetId,
          );
          return { success: true, data: { output: listResult.text } };
        }
        case 'delete_repeater': {
          if (!params.repeater_id) return { success: false, error: 'repeater_id is required' };
          const deleteResult = await ctrl.deleteRepeaterHandler.handle(
            ctrl.requests,
            params.repeater_id,
            effectiveTargetId,
          );
          return { success: true, data: { output: deleteResult.text } };
        }
        case 'get_repeater_detail': {
          if (!params.repeater_id) return { success: false, error: 'repeater_id is required' };
          const detailResult = await ctrl.getRepeaterDetailHandler.handle(
            ctrl.requests,
            params.repeater_id,
            effectiveTargetId,
          );
          return { success: true, data: { output: detailResult.text } };
        }
        case 'update_repeater_content': {
          if (!params.repeater_id) return { success: false, error: 'repeater_id is required' };
          if (!params.target) return { success: false, error: 'target is required' };
          const updateResult = await ctrl.updateRepeaterContentHandler.handle(
            ctrl.requests,
            params.repeater_id,
            params.target,
            params.old_content || '',
            params.new_content || '',
            effectiveTargetId,
          );
          return {
            success: true,
            data: { output: updateResult.text },
          };
        }
        case 'run_repeater': {
          if (!params.repeater_id) return { success: false, error: 'repeater_id is required' };
          const runResult = await ctrl.runRepeaterHandler.handle(
            ctrl.requests,
            params.repeater_id,
            effectiveTargetId,
          );
          return { success: true, data: { output: runResult.text } };
        }
        case 'list_reports': {
          const listResult = await ctrl.listReportsHandler.handle(effectiveTargetId);
          return { success: true, data: { output: listResult.text } };
        }
        case 'create_report': {
          if (!params.content) return { success: false, error: 'content is required' };
          const createResult = await ctrl.createReportHandler.handle(
            params.content,
            effectiveTargetId,
            params.title,
          );
          return { success: true, data: { output: createResult.text } };
        }
        case 'read_report': {
          if (!params.report_id) return { success: false, error: 'report_id is required' };
          const readResult = await ctrl.readReportHandler.handle(
            params.report_id,
            params.start_line,
            params.end_line,
            effectiveTargetId,
          );
          return { success: true, data: { output: readResult.text } };
        }
        case 'update_report': {
          if (!params.report_ref) return { success: false, error: 'report_ref is required' };
          if (!params.old_content) return { success: false, error: 'old_content is required' };
          const updateResult = await ctrl.updateReportHandler.handle(
            params.report_ref,
            params.old_content,
            params.new_content || '',
            effectiveTargetId,
          );
          return { success: true, data: { output: updateResult.text } };
        }
        default:
          return { success: false, error: 'Unknown emulate tool: ' + toolName };
      }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  // ── Instance methods ──────────────────────────────────────────────

  public setRequests(requests: NetworkRequest[]): void {
    this.requests = requests;
  }

  public setUnpackedScripts(scripts: Map<string, CdpScriptUnpackedData> | undefined): void {
    this.unpackedScripts = scripts;
  }

  public setTargetId(targetId: string | null): void {
    this.targetId = targetId;
  }

  public listHttps(filter: ListHttpFilter = {}, limit: number = 50): ListHttpResult {
    const allRequests = this.requests;
    let filteredRequests = allRequests;
    if (this.filter) filteredRequests = filterRequestsByConfig(allRequests, this.filter, '');
    const result = this.listHttpHandler.handle(filteredRequests, filter, limit, allRequests);
    return result;
  }
  public listHttpsText(filter: ListHttpFilter = {}, limit: number = 50): string {
    return this.listHttps(filter, limit).text;
  }
  public listHostsText(): string {
    return this.listHostsHandler.handle(this.requests).text;
  }
  public listSourcesText(filter: ListSourcesFilter = {}): string {
    return this.listSourcesHandler.handle(this.requests, filter).text;
  }
  public listResourcesText(filter: ListResourcesFilter = {}): string {
    return this.listResourcesHandler.handle(this.requests, filter).text;
  }
  public getSourceDetailText(filepath: string): string {
    return this.getSourceDetailHandler.handle(this.requests, this.unpackedScripts, filepath).text;
  }
  public getHttpsDetailText(index: number): string {
    return this.getHttpsDetailHandler.handle(this.requests, index).text;
  }
  public getResourceContentText(filename: string, options: GetResourceContentOptions = {}): string {
    return this.getResourceContentHandler.handle(this.requests, filename, options).text;
  }
  public async sendToRepeaterText(index: number): Promise<string> {
    const result = await this.sendToRepeaterHandler.handle(this.requests, index, this.targetId);
    return result.text;
  }
  public async listRepeatersText(): Promise<string> {
    const result = await this.listRepeatersHandler.handle(this.requests, this.targetId);
    return result.text;
  }
  public async deleteRepeaterText(repeaterId: string): Promise<string> {
    const result = await this.deleteRepeaterHandler.handle(
      this.requests,
      repeaterId,
      this.targetId,
    );
    return result.text;
  }
  public async getRepeaterDetailText(repeaterId: string): Promise<string> {
    const result = await this.getRepeaterDetailHandler.handle(
      this.requests,
      repeaterId,
      this.targetId,
    );
    return result.text;
  }
  public async updateRepeaterContentText(
    repeaterId: string,
    target: 'params' | 'headers' | 'body',
    oldContent: string,
    newContent: string,
  ): Promise<string> {
    const result = await this.updateRepeaterContentHandler.handle(
      this.requests,
      repeaterId,
      target,
      oldContent,
      newContent,
      this.targetId,
    );
    return result.text;
  }
  public async runRepeaterText(repeaterId: string): Promise<string> {
    const result = await this.runRepeaterHandler.handle(this.requests, repeaterId, this.targetId);
    return result.text;
  }
  public getTrafficSummary(): TrafficSummary {
    return this.getTrafficSummaryHandler.handle(this.requests);
  }
  public setFilter(filter: InspectorFilter): void {
    this.filter = filter;
  }
  public getFilter(): InspectorFilter | undefined {
    return this.filter;
  }
  public getFilterText(): string {
    if (!this.filter) return this.getFilterHandler.handle({} as InspectorFilter, this.requests);
    return this.getFilterHandler.handle(this.filter, this.requests);
  }
  public setOnFilterChanged(cb: ((filter: InspectorFilter) => void) | null): void {
    this.onFilterChanged = cb;
  }
  public applyFilterChanges(params: ApplyFilterParams): InspectorFilter {
    const current = this.filter || ({} as InspectorFilter);
    const updated = this.applyFilterHandler.apply(current, params);
    this.filter = updated;
    if (this.onFilterChanged) this.onFilterChanged(updated);
    return updated;
  }
}
