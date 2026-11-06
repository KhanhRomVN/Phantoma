import { createContext, useContext } from 'react';
import type { FileSystem } from './fileStore';

/** FileSystem thật của target đang chọn (dựng từ recon:{targetId}/files/). */
export const ReconFsContext = createContext<FileSystem | null>(null);

export function useReconFs(): FileSystem | null {
  return useContext(ReconFsContext);
}