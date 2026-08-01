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
import { GetTrafficSummaryHandler } from '../modules/Emulate/handler/GetTrafficSummaryHandler';
import { NetworkRequest } from '../modules/Emulate/types/inspector';
import type { CdpScriptUnpackedData } from '../modules/Emulate/hooks/useNetworkEvents';
import type { TrafficSummary } from '../components/RightPanel/Agent/feature/Chat/prompts/emulate';

export class EmulateController {
  private static instance: EmulateController;

  private requests: NetworkRequest[] = [];
  private unpackedScripts: Map<string, CdpScriptUnpackedData> | undefined;

  private listHttpHandler: ListHttpHandler;
  private listHostsHandler: ListHostsHandler;
  private listSourcesHandler: ListSourcesHandler;
  private getSourceDetailHandler: GetSourceDetailHandler;
  private getTrafficSummaryHandler: GetTrafficSummaryHandler;

  private constructor() {
    this.listHttpHandler = new ListHttpHandler();
    this.listHostsHandler = new ListHostsHandler();
    this.listSourcesHandler = new ListSourcesHandler();
    this.getSourceDetailHandler = new GetSourceDetailHandler();
    this.getTrafficSummaryHandler = new GetTrafficSummaryHandler();
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

  /** Lọc danh sách HTTPS requests */
  public listHttps(filter: ListHttpFilter = {}, limit: number = 50): ListHttpResult {
    return this.listHttpHandler.handle(this.requests, filter, limit);
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

  // ─── traffic_summary ───

  /** Lấy tổng quan distinct values của traffic hiện tại (hosts, methods, statuses, types) */
  public getTrafficSummary(): TrafficSummary {
    return this.getTrafficSummaryHandler.handle(this.requests);
  }
}
