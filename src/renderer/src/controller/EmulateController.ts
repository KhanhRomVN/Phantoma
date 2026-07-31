/**
 * EmulateController — Singleton controller điều phối các handler cho Emulate feature.
 *
 * Usage:
 *   // Từ Emulate component: cập nhật requests
 *   EmulateController.getInstance().setRequests(requests);
 *
 *   // Từ Agent Chat: gọi tool
 *   const result = EmulateController.getInstance().listHttps({ method: 'GET' }, 20);
 */
import {
  ListHttpHandler,
  ListHttpFilter,
  ListHttpResult,
} from '../modules/Emulate/handler/ListHttpHandler';
import { NetworkRequest } from '../modules/Emulate/types/inspector';

export class EmulateController {
  private static instance: EmulateController;

  private requests: NetworkRequest[] = [];
  private listHttpHandler: ListHttpHandler;

  private constructor() {
    this.listHttpHandler = new ListHttpHandler();
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

  /** Lọc danh sách HTTPS requests */
  public listHttps(filter: ListHttpFilter = {}, limit: number = 50): ListHttpResult {
    return this.listHttpHandler.handle(this.requests, filter, limit);
  }

  /** Lấy text table kết quả (format phù hợp cho LLM) */
  public listHttpsText(filter: ListHttpFilter = {}, limit: number = 50): string {
    return this.listHttps(filter, limit).text;
  }
}
