import { EmulateController } from '../../../../../../../../controller/EmulateController';

export interface ListSourcesParams {
  filter?: {
    host?: string;
    type?: string;
  };
}

/**
 * Execute list_sources tool — lấy danh sách source files dạng cây.
 */
export async function executeListSources(params: ListSourcesParams): Promise<string | null> {
  const filter = params.filter || {};

  try {
    const text = EmulateController.getInstance().listSourcesText(filter);
    return text;
  } catch (e: any) {
    return `[list_sources] Result: Error - ${e.message || 'Unknown error'}`;
  }
}