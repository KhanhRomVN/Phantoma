export interface ForkDef {
  id: string;
  name: string;
  desc: string;
  badge: string;
  tone: string;
  url: string;
  dirPrefix: string;
  systemDirs: string[];
}

export interface BrowserFork {
  id: string;
  name: string;
  desc: string;
  badge: string;
  tone: string;
  url: string;
  version: string | null;
  path: string | null;
  installed: boolean;
}

export interface InstalledBuild {
  version: string | null;
  path: string;
}

export interface ForkSource {
  listUrl: string;
  downloadUrl: (version: string) => string;
}

export type InstallPhase = 'checking' | 'downloading' | 'extracting' | 'error';

export interface InstallJob {
  version: string;
  phase: InstallPhase;
  progress: number;
  error: string | null;
}

export interface ForkVersion {
  version: string | null;
  path: string;
  current: boolean;
}

export interface ForkUpdateInfo {
  id: string;
  name: string;
  supported: boolean;
  versions: ForkVersion[];
  current: string | null;
  latest: string | null;
  hasUpdate: boolean;
  checkError: string | null;
  job: InstallJob | null;
}

export interface LatestVersionEntry {
  at: number;
  version: string | null;
  error: string | null;
}
