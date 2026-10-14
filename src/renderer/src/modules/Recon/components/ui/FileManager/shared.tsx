import type { MouseEvent } from 'react';
import { Folder, File as FileGeneric, FileAudio, FileCode, FileImage, FileJson, FileText, FileVideo } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { withAlpha } from '../../targetType';
import type { FileKind, FsNode } from './fileTypes';

export const KIND_META: Record<FileKind, { icon: LucideIcon; color: string }> = {
  image: { icon: FileImage, color: '#22c55e' },
  video: { icon: FileVideo, color: '#a855f7' },
  audio: { icon: FileAudio, color: '#ec4899' },
  pdf: { icon: FileText, color: '#ef4444' },
  markdown: { icon: FileText, color: '#3686ff' },
  code: { icon: FileCode, color: '#eab308' },
  text: { icon: FileText, color: '#9ca3af' },
  data: { icon: FileJson, color: '#06b6d4' },
  other: { icon: FileGeneric, color: '#9ca3af' },
};

export const FOLDER_COLOR = '#f97316';

/** Props shared by the views that render a node list (Grid, Tree). */
export interface FileViewProps {
  nodes: FsNode[];
  selected: Set<string>;
  selectable: boolean;
  /** Click on the item body: ctrl/cmd/shift => add/remove from the selection, otherwise select only that item. */
  onClickNode: (node: FsNode, e: MouseEvent) => void;
  /** Click on the checkbox: toggles exactly one item. */
  onToggle: (node: FsNode) => void;
  /** Open: folder => enter it, file => open the viewer. */
  onOpen: (node: FsNode) => void;
}

export function nodeColor(node: FsNode): string {
  return node.type === 'folder' ? FOLDER_COLOR : KIND_META[node.kind].color;
}

/** Icon of a folder or file by kind; rounded box with a light accent background. */
export function NodeIcon({ node, size = 18, box = false }: { node: FsNode; size?: number; box?: boolean }) {
  const color = nodeColor(node);
  const Icon = node.type === 'folder' ? Folder : KIND_META[node.kind].icon;
  const icon = <Icon style={{ width: size, height: size, color }} strokeWidth={1.75} />;
  if (!box) return icon;
  return (
    <div
      className='shrink-0 rounded-lg flex items-center justify-center'
      style={{ width: size * 2, height: size * 2, backgroundColor: withAlpha(color, 0.15) }}
    >
      {icon}
    </div>
  );
}

/** Shared checkbox; no <input> so it matches the style of the rest of Recon. */
export function CheckBox({ checked, onChange, className }: { checked: boolean; onChange: () => void; className?: string }) {
  return (
    <button
      type='button'
      role='checkbox'
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={
        'shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ' +
        (checked ? 'bg-primary border-primary text-white' : 'border-border bg-card-background hover:border-primary/60') +
        (className ? ` ${className}` : '')
      }
    >
      {checked && (
        <svg viewBox='0 0 24 24' width='10' height='10' fill='none' stroke='currentColor' strokeWidth='3.5' strokeLinecap='round' strokeLinejoin='round'>
          <polyline points='20 6 9 17 4 12' />
        </svg>
      )}
    </button>
  );
}