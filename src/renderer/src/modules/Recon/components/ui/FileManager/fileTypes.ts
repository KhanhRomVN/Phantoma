// --- FileManager Types ---

export type FileKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'markdown'
  | 'code'
  | 'text'
  | 'data'
  | 'other';

export interface FolderNode {
  type: 'folder';
  id: string;
  name: string;
  /** Path relative to the store root, e.g. 'reports/2026'. Root = ''. */
  path: string;
  /** Parent folder path; the root has parentPath = null. */
  parentPath: string | null;
}

export interface FileNode {
  type: 'file';
  id: string;
  name: string;
  path: string;
  parentPath: string;
  ext: string; // without the dot, lowercase
  kind: FileKind;
  /** Byte count; undefined when unknown (files loaded by URL). */
  size?: number;
  modified: string; // ISO
  /** Text content (md, js, json...) for preview / download. */
  content?: string;
  /** Asset URL for media (image, video, audio, pdf). */
  url?: string;
}

export type FsNode = FolderNode | FileNode;

// --- View / sort / filter ---

/** Two views: grid (cards) and tree (detail rows). */
export type FileView = 'grid' | 'tree';

export type SortKey = 'name' | 'kind' | 'size' | 'modified';
export type SortDir = 'asc' | 'desc';

export interface FileSort {
  key: SortKey;
  dir: SortDir;
}

export interface FileFilter {
  query?: string;
  /** Empty/undefined = all kinds. When set, only files of these kinds are shown. */
  kinds?: FileKind[];
  exts?: string[];
}

// --- Configuration ---

export interface FileManagerFeatures {
  search: boolean;
  filter: boolean;
  sort: boolean;
  viewSwitch: boolean;
  breadcrumb: boolean;
  multiSelect: boolean;
  preview: boolean;
  download: boolean;
  // Write operations: UI only for now (the store is still read-only, changes are not saved)
  createFolder: boolean;
  upload: boolean;
  edit: boolean;
  rename: boolean;
  delete: boolean;
  move: boolean;
}

/** Default: everything enabled. Write operations (createFolder...move) are UI only, not saved to the store. */
export const DEFAULT_FEATURES: FileManagerFeatures = {
  search: true,
  filter: true,
  sort: true,
  viewSwitch: true,
  breadcrumb: true,
  multiSelect: true,
  preview: true,
  download: true,
  createFolder: true,
  upload: true,
  edit: true,
  rename: true,
  delete: true,
  move: true,
};

const VIEW_KEYS: FileView[] = ['grid', 'tree'];
const SORT_KEYS: SortKey[] = ['name', 'kind', 'size', 'modified'];

/**
 * Reads the options of `@box ui=files` (every value is a string) into a FileManagerConfig.
 * Example: `@box w=10 h=10 ui=files root=notes view=tree sort=size:desc kinds=image,video q=abc features=-upload,-delete`
 * features: `-name` disables, `name` enables; with `none` everything is disabled first, then the listed names are enabled.
 */
export function configFromOptions(o: Record<string, any> = {}): FileManagerConfig {
  const list = (v: unknown): string[] =>
    typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const cfg: FileManagerConfig = {};

  if (o.mock) cfg.mockFolder = String(o.mock);
  if (o.root) cfg.root = String(o.root).replace(/^\/+|\/+$/g, '');
  if (VIEW_KEYS.includes(o.view)) cfg.view = o.view as FileView;

  if (o.sort) {
    const [key, dir] = String(o.sort).split(':');
    if (SORT_KEYS.includes(key as SortKey)) cfg.sort = { key: key as SortKey, dir: dir === 'desc' ? 'desc' : 'asc' };
  }

  const kinds = list(o.kinds).filter((k): k is FileKind => k in KIND_LABEL);
  const exts = list(o.exts).map((e) => e.replace(/^\./, '').toLowerCase());
  if (o.q || kinds.length || exts.length) {
    cfg.filter = { query: o.q ? String(o.q) : undefined, kinds: kinds.length ? kinds : undefined, exts: exts.length ? exts : undefined };
  }

  const names = list(o.features);
  if (names.length) {
    const keys = Object.keys(DEFAULT_FEATURES) as (keyof FileManagerFeatures)[];
    const features: Partial<FileManagerFeatures> = {};
    if (names.includes('none')) keys.forEach((k) => (features[k] = false));
    names.forEach((n) => {
      const off = n.startsWith('-');
      const key = (off ? n.slice(1) : n) as keyof FileManagerFeatures;
      if (keys.includes(key)) features[key] = !off;
    });
    cfg.features = features;
  }
  return cfg;
}

export interface FileManagerConfig {
  /** Mock folder (mock/<mockFolder>/files). Default 'mock1'. */
  mockFolder?: string;
  /** Root folder to display (sub path inside the store). Default '' = everything. */
  root?: string;
  view?: FileView;
  sort?: FileSort;
  filter?: FileFilter;
  /** Only pass the features you want to change from DEFAULT_FEATURES. */
  features?: Partial<FileManagerFeatures>;
}

// --- File classification ---

const EXT_KIND: Record<string, FileKind> = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image',
  mp4: 'video', webm: 'video', mov: 'video', mkv: 'video',
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio',
  pdf: 'pdf',
  md: 'markdown', markdown: 'markdown',
  js: 'code', ts: 'code', tsx: 'code', jsx: 'code', py: 'code', html: 'code', css: 'code', sh: 'code',
  txt: 'text', log: 'text',
  json: 'data', csv: 'data', yaml: 'data', yml: 'data', xml: 'data',
};

export const KIND_LABEL: Record<FileKind, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  pdf: 'PDF',
  markdown: 'Markdown',
  code: 'Source code',
  text: 'Text',
  data: 'Data',
  other: 'Other',
};

export const KIND_ORDER: FileKind[] = [
  'image', 'video', 'audio', 'pdf', 'markdown', 'code', 'text', 'data', 'other',
];

export function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function kindOf(ext: string): FileKind {
  return EXT_KIND[ext] ?? 'other';
}

/** 1536 -> '1.5 KB'; undefined -> '—'. */
export function formatSize(bytes?: number): string {
  if (bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[u]}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}