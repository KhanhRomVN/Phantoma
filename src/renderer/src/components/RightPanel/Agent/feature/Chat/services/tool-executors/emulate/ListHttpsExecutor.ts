import { EmulateController } from '../../../../../../../../controller/EmulateController';

export interface ListHttpsParams {
  filter?: {
    method?: string;
    host?: string;
    path?: string;
    status?: number;
  };
  limit?: number;
}

/**
 * Execute list_https tool — lọc danh sách HTTPS requests đã capture.
 * Gọi trực tiếp EmulateController (không qua IPC).
 */
export async function executeListHttps(params: ListHttpsParams): Promise<string | null> {
  const filter = params.filter || {};
  const limit = params.limit || 50;

  try {
    const text = EmulateController.getInstance().listHttpsText(filter, limit);
    return text;
  } catch (e: any) {
    return `[list_https] Result: Error - ${e.message || 'Unknown error'}`;
  }
}