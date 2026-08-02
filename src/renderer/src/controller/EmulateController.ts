/**
 * EmulateController — Singleton controller điều phối các handler cho Emulate module.
 *
 * ?Usage:
 *   // Từ Emulate component: cập nhật requests
 *   EmulateController.getInstance().setRequests(requests);
 *   EmulateController.getInstance().setUnpackedScripts(unpackedScripts);
 *
 *   const result = EmulateController.getInstance().listHttpsText({ method: 'GET' }, 20);
 *   const hosts = EmulateController.getInstance().listHostsText();
 *   const sources = EmulateController.getInstance().listSourcesText({ type: 'js' });
 *   const source = EmulateController.getInstance().getSourceDetailText(3);
 *   const detail = EmulateController.getInstance().getHttpsDetailText(0);
 *   const summary = EmulateController.getInstance().getTrafficSummary();
 */
import {
  ListHttpHandler,
  ListHttpFilter,
  ListHttpResult,
} from '../modules/Emulate/handler/ListHttpHandler';
import { ListHostsHandler } from '../modules/Emulate/handler/ListHostsHandler';
import {
  ListSourcesHandler,
  ListSourcesFilter,
} from '../modules/Emulate/handler/ListSourcesHandler';
import { GetSourceDetailHandler } from '../modules/Emulate/handler/GetSourceDetailHandler';
import { GetHttpsDetailHandler } from '../modules/Emulate/handler/GetHttpsDetailHandler';
import { GetTrafficSummaryHandler } from '../modules/Emulate/handler/GetTrafficSummaryHandler';
import { GetFilterHandler } from '../modules/Emulate/handler/GetFilterHandler';
import { ApplyFilterHandler } from '../modules/Emulate/handler/ApplyFilterHandler';
import { NetworkRequest } from '../modules/Emulate/types/inspector';
import { InspectorFilter } from '../modules/Emulate/types/filter.types';
import { filterRequestsByConfig } from '../modules/Emulate/hooks/useRequestFilter';
import type { ApplyFilterParams } from '../components/RightPanel/Agent/feature/Chat/services/parsers/emulate/ApplyFilterParser';
import type { CdpScriptUnpackedData } from '../modules/Emulate/hooks/useNetworkEvents';
import type { TrafficSummary } from '../components/RightPanel/Agent/feature/Chat/prompts/emulate';

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

  public static getInstance(): EmulateController {
    if (!EmulateController.instance) {
      EmulateController.instance = new EmulateController();
    }
    return EmulateController.instance;
  }

  /** Cập nhật danh sách requests hiện tại (gọi từ Emulate component) */
  public setRequests(requests: NetworkRequest[]): void {
    this.requests = requests;
  }

  /** Cập nhật unpacked scripts (gọi từ Emulate component) */
  public setUnpackedScripts(scripts: Map<string, CdpScriptUnpackedData> | undefined): void {
    this.unpackedScripts = scripts;
  }

  // ─── list_https ───

  /** Lọc danh sách HTTPS requests (có merge với InspectorFilter từ apply_filter) */
  public listHttps(filter: ListHttpFilter = {}, limit: number = 50): ListHttpResult {
    let requests = this.requests;
    if (this.filter) {
      requests = filterRequestsByConfig(requests, this.filter, '');
    }
    return this.listHttpHandler.handle(requests, filter, limit);
  }

  /** Lấy text table kết quả (format phù hợp cho LLM) */
  public listHttpsText(filter: ListHttpFilter = {}, limit: number = 50): string {
    return this.listHttps(filter, limit).text;
  }

  // ─── list_hosts ───

  /** Lấy danh sách unique hosts */
  public listHostsText(): string {
    return this.listHostsHandler.handle(this.requests).text;
  }

  // ─── list_sources ───

  /** Lấy danh sách source files dạng cây */
  public listSourcesText(filter: ListSourcesFilter = {}): string {
    return this.listSourcesHandler.handle(this.requests, filter).text;
  }

  // ─── get_source_detail ───

  /** Lấy nội dung source code của 1 file */
  public getSourceDetailText(index: number): string {
    return this.getSourceDetailHandler.handle(this.requests, this.unpackedScripts, index).text;
  }

  // ─── get_https_detail ───

  /** Lấy chi tiết request/response của 1 HTTPS request */
  public getHttpsDetailText(index: number): string {
    return this.getHttpsDetailHandler.handle(this.requests, index).text;
  }

  // ─── traffic_summary ───

  /** Lấy tổng quan distinct values của traffic hiện tại (hosts, methods, statuses, types) */
  public getTrafficSummary(): TrafficSummary {
    return this.getTrafficSummaryHandler.handle(this.requests);
  }

  // ─── filter ───

  /** Cập nhật filter hiện tại (gọi từ Emulate component khi filter thay đổi) */
  public setFilter(filter: InspectorFilter): void {
    this.filter = filter;
  }

  /** Lấy filter hiện tại */
  public getFilter(): InspectorFilter | undefined {
    return this.filter;
  }

  /** Lấy text mô tả filter hiện tại (dùng cho LLM context) */
  public getFilterText(): string {
    if (!this.filter) {
      return this.getFilterHandler.handle({} as InspectorFilter, this.requests);
    }
    return this.getFilterHandler.handle(this.filter, this.requests);
  }

  /** Đăng ký callback khi filter bị thay đổi bởi AI (để sync UI) */
  public setOnFilterChanged(cb: ((filter: InspectorFilter) => void) | null): void {
    this.onFilterChanged = cb;
  }

  /** Áp dụng thay đổi filter từ AI request, trả về filter mới */
  public applyFilterChanges(params: ApplyFilterParams): InspectorFilter {
    const current = this.filter || ({} as InspectorFilter);
    const updated = this.applyFilterHandler.apply(current, params);
    this.filter = updated;
    if (this.onFilterChanged) {
      this.onFilterChanged(updated);
    }
    return updated;
  }
}