import { EmulateController } from '../../../../../../../../controller/EmulateController';

export interface GetSourceDetailParams {
  index: number;
}

/**
 * Execute get_source_detail tool — lấy nội dung source code của 1 file.
 */
export async function executeGetSourceDetail(params: GetSourceDetailParams): Promise<string | null> {
  const { index } = params;

  try {
    const text = EmulateController.getInstance().getSourceDetailText(index);
    return text;
  } catch (e: any) {
    return `[get_source_detail] Result: Error - ${e.message || 'Unknown error'}`;
  }
}