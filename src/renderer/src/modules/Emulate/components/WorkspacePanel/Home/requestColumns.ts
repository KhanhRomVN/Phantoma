export type ColumnVisibility = Record<string, boolean>;

export const TOGGLEABLE_COLUMNS: { id: string; label: string }[] = [
  { id: 'method', label: 'Method' },
  { id: 'host', label: 'Host' },
  { id: 'path', label: 'Path' },
  { id: 'status', label: 'Status' },
  { id: 'type', label: 'Type' },
  { id: 'tags', label: 'Tags' },
  { id: 'size', label: 'Size' },
  { id: 'time', label: 'Time' },
];

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = { size: false, time: false };

export const isColumnVisible = (visibility: ColumnVisibility, id: string): boolean =>
  visibility[id] !== false;

const GRID_TRACK: Record<string, string> = {
  select: '36px',
  method: 'minmax(72px, 0.8fr)',
  host: 'minmax(0, 2fr)',
  path: 'minmax(0, 4fr)',
  status: 'minmax(88px, 1.2fr)',
  type: 'minmax(0, 0.8fr)',
  tags: 'minmax(0, 1.2fr)',
  size: 'minmax(0, 0.9fr)',
  time: 'minmax(0, 0.9fr)',
};

export const getGridTemplate = (ids: string[]): string =>
  ids.map((id) => GRID_TRACK[id] ?? 'minmax(0, 1fr)').join(' ');