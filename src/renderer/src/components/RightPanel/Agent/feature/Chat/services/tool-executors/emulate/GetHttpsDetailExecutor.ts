import { EmulateController } from '../../../../../../../../controller/EmulateController';

export interface GetHttpsDetailParams {
  index: number;
}

/**
 * Execute get_https_detail tool — lấy chi tiết request/response của 1 HTTPS request.
 */
export async function executeGetHttpsDetail(params: GetHttpsDetailParams): Promise<string | null> {
  const { index } = params;

  try {
    const text = EmulateController.getInstance().getHttpsDetailText(index);
    return text;
  } catch (e: any) {
    return `[get_https_detail] Result: Error - ${e.message || 'Unknown error'}`;
  }
}