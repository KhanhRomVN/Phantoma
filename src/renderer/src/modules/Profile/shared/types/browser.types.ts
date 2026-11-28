import type { LucideIcon } from 'lucide-react';
import type { IpInfo } from '@renderer/services/ip-lookup.service';
import type { SessionFootprint } from './activity.types';
import type { BrowserEngine } from './source.types';
import type { Tone } from './ui.types';

export type BrowserKind = BrowserEngine;

// Re-export from shared types
export type { DetailTab } from '@shared/types/proxy.types';

export interface Fork {
  id: string;
  name: string;
  version: string | null;
  desc: string;
  badge: string;
  tone: Tone;
  url: string;
  path: string | null;
  installed: boolean;
}

export interface Toggle {
  id: string;
  label: string;
  desc: string;
  chromiumOnly?: boolean;
  defaultOn: boolean;
}

export interface Phase {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  items: Toggle[];
}

// Re-export from shared types
export type { ParsedQuery, FilterTag } from '@shared/types/proxy.types';

export interface FolderInfo {
  path: string;
  exists: boolean;
  launch: { userDataDir: string; profileDirectory: string | null };
  browsers: Record<BrowserKind, { path: string; exists: boolean; launched: boolean }>;
}

export interface RunningBrowser {
  emailId: string;
  browser: BrowserKind;
  pid: number;
  startedAt: string;
  sessionId: string;
  external?: boolean;
}

export interface LaunchInput {
  browser: BrowserKind;
  url?: string;
  proxyServer?: string;
  forkId?: string;
  ip?: IpInfo | null;
  footprint?: SessionFootprint | null;
}

export type ForkInstallPhase = 'checking' | 'downloading' | 'extracting' | 'error';

export interface ForkInstallJob {
  version: string;
  phase: ForkInstallPhase;
  progress: number;
  error: string | null;
}

export interface ForkUpdateInfo {
  id: string;
  name: string;
  supported: boolean;
  versions: { version: string | null; path: string; current: boolean }[];
  current: string | null;
  latest: string | null;
  hasUpdate: boolean;
  checkError: string | null;
  job: ForkInstallJob | null;
}

export interface SavedPassword {
  id: string;
  url: string;
  username: string;
  password: string;
}
