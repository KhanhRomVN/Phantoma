import { dialogIpc } from '../ipc/dialog.ipc';

export const dialogService = {
  selectPaths: async (kind: 'file' | 'folder', multiple = true): Promise<string[]> => {
    const res = await dialogIpc.selectPaths({ kind, multiple });
    return res?.success ? (res.paths as string[]) : [];
  },
};