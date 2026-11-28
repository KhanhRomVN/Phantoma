// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useCallback, useEffect, useState } from 'react';

// ── Services ──
import { codeApi } from '../../../shared/api/code.api';

// ── Utils ──
import type { CommitFile } from '../utils/graph.util';
import { VIRTUAL_PREFIX } from '../constants/git-view.constants';

// ─── Types ───────────────────────────────────────────────────────────────────
interface UseGitSelectionProps {
  projectPath: string;
  initialHash?: string | null;
}

interface UseGitSelectionReturn {
  selectedHash: string | null;
  files: CommitFile[];
  filesLoading: boolean;
  activeFile: string | null;
  diffOpen: boolean;
  setSelectedHash: (hash: string | null) => void;
  setActiveFile: (path: string | null) => void;
  setDiffOpen: (open: boolean) => void;
  openDiff: (path: string) => void;
  closeDiff: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useGitSelection({
  projectPath,
  initialHash = null,
}: UseGitSelectionProps): UseGitSelectionReturn {
  // ── State ──
  const [selectedHash, setSelectedHash] = useState<string | null>(initialHash);
  const [files, setFiles] = useState<CommitFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);

  // ── Effects ──
  useEffect(() => {
    setActiveFile(null);
    if (!selectedHash) setDiffOpen(false);
  }, [selectedHash]);

  useEffect(() => {
    if (!selectedHash || !projectPath || selectedHash.startsWith(VIRTUAL_PREFIX)) {
      setFiles([]);
      return;
    }
    let cancelled = false;
    setFilesLoading(true);
    codeApi.git
      .commitFiles(projectPath, selectedHash)
      .then((res: { files?: CommitFile[] }) => {
        if (!cancelled) setFiles(res?.files ?? []);
      })
      .catch(() => {
        if (!cancelled) setFiles([]);
      })
      .finally(() => {
        if (!cancelled) setFilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedHash, projectPath]);

  // ── Callbacks ──
  const openDiff = useCallback((path: string) => {
    setActiveFile(path);
    setDiffOpen(true);
  }, []);

  const closeDiff = useCallback(() => setDiffOpen(false), []);

  return {
    selectedHash,
    files,
    filesLoading,
    activeFile,
    diffOpen,
    setSelectedHash,
    setActiveFile,
    setDiffOpen,
    openDiff,
    closeDiff,
  };
}