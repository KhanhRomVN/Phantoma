export type SourceType = 'reddit' | 'hackernews' | 'lobsters' | 'devto' | 'medium' | 'stackoverflow';
export type MediaKind = 'text' | 'image' | 'gallery' | 'audio' | 'video' | 'diff' | 'link';
export type Priority = 'high' | 'medium' | 'low';
export type ViewId = 'feed' | 'monitors' | 'bookmarks';
export type Density = 'compact' | 'cozy' | 'spacious';
export type PostStage = 'new' | 'reading' | 'saved' | 'done';

export interface MediaItem {
  type: 'image' | 'video' | 'audio';
  url: string;
  thumb?: string;
  durationSec?: number;
  alt?: string;
}

export interface DiffLine {
  kind: 'add' | 'remove' | 'same';
  text: string;
}

export interface SnapshotDiff {
  before: string[];
  after: string[];
  addedCount: number;
  removedCount: number;
}

export interface PostNote {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface Post {
  id: string;
  monitorId: string;
  sourceType: SourceType;
  sourceName: string;
  sourceDomain: string;
  author?: string;
  title?: string;
  body: string;
  mediaType: MediaKind;
  mediaItems?: MediaItem[];
  linkPreview?: { title: string; description: string; domain: string; thumb?: string };
  diff?: SnapshotDiff;
  tags: string[];
  priority: Priority;
  createdAt: string;
  isRecommended?: boolean;
  archived: boolean;
  notes: PostNote[];
  viewedCount: number;
  isNote?: boolean;
  pinned?: boolean;
  assigned?: boolean;
  expires?: boolean;
  confidence?: number;
  stage?: PostStage;
}

export interface MonitorItem {
  id: string;
  name: string;
  sourceType: SourceType;
  schedule: string;
  hits24h: number;
  status: 'running' | 'paused' | 'error';
  group: string;
  tags: string[];
}

export interface MonitorGroup {
  id: string;
  name: string;
  monitorIds: string[];
}

export interface TagDef {
  name: string;
  count: number;
}