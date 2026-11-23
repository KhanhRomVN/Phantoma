import { createContext } from 'react';
import { FileExplorerContextValue } from '../types/file-explorer.types';

export const FileExplorerContext = createContext<FileExplorerContextValue>({
  nodeMetaRef: { current: new Map() },
  gitStatus: {},
  ghostIndex: new Map(),
  ignoredPaths: [],
  creating: null,
  setCreating: () => {},
  clipboard: null,
  setClipboard: () => {},
  onCopyAbsolutePath: () => {},
  onCopyRelativePath: () => {},
  onCutFile: () => {},
  onCopyFile: () => {},
  onPasteFile: () => {},
  renamingId: null,
  errorPaths: new Set<string>(),
  onViewRemoteDiff: () => {},
  setRenamingId: () => {},
  scopeBranch: '',
  nodeScope: [],
  scopeRoot: '',
});
