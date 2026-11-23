import { type Commit, type CommitFile, type GraphRow } from '../utils/graph.util';

// ─── Virtual Row (local changes not on remote) ──────────────────────────
export interface LocalChange {
  name: string;
  files: CommitFile[];
}

export interface VirtualRowProps {
  branch: string;
  unstagedCount: number;
  stagedCount: number;
  unpushedCount: number;
  col: number;
  lines: number[];
  graphWidth: number;
  selected: boolean;
  dimmed: boolean;
  hangCol: number | null;
  hangFull: boolean;
  onSelect: (key: string) => void;
}


// ─── Commit Row ─────────────────────────────────────────────────────────
export interface CommitRowProps {
  commit: Commit;
  row: GraphRow;
  laneCount: number;
  graphWidth: number;
  selected: boolean;
  dimmed: boolean;
  hideLocals?: string[];
  unpushed?: boolean;
  pushing?: boolean;
  onPush?: () => void;
  onSelect: (hash: string) => void;
  onContextMenu: (e: React.MouseEvent, commit: Commit) => void;
  onHover: (e: React.MouseEvent | null, commit?: Commit) => void;
}
