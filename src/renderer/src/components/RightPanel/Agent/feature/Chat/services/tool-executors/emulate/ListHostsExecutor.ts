import { EmulateController } from '../../../../../../../../controller/EmulateController';

/**
 * Execute list_hosts tool — lấy danh sách unique hosts.
 */
export async function executeListHosts(): Promise<string | null> {
  try {
    const text = EmulateController.getInstance().listHostsText();
    return text;
  } catch (e: any) {
    return `[list_hosts] Result: Error - ${e.message || 'Unknown error'}`;
  }
}