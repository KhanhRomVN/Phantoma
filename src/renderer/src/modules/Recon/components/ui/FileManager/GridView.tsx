import { cn } from '@renderer/shared/utils/cn';
import { KIND_LABEL, formatSize } from './fileTypes';
import type { FileNode, FsNode } from './fileTypes';
import { CheckBox, NodeIcon } from './shared';
import type { FileViewProps } from './shared';

/** Preview inside the card: real image/video if a url exists, text shows the first lines, otherwise an icon. */
function Preview({ file }: { file: FileNode }) {
  if (file.kind === 'image' && file.url) {
    return <img src={file.url} alt={file.name} className='w-full h-full object-cover' draggable={false} />;
  }
  if (file.kind === 'video' && file.url) {
    return <video src={file.url} className='w-full h-full object-cover' muted preload='metadata' />;
  }
  if (file.content !== undefined) {
    const head = file.content.split('\n').slice(0, 8).join('\n');
    return (
      <pre className='w-full h-full p-2 overflow-hidden text-[10px] leading-snug text-text-secondary font-mono whitespace-pre-wrap break-all text-left'>
        {head}
      </pre>
    );
  }
  return <NodeIcon node={file} size={32} />;
}

function subtitle(node: FsNode): string {
  return node.type === 'folder' ? 'Folder' : `${KIND_LABEL[node.kind]} · ${formatSize(node.size)}`;
}

function Card({
  node,
  isSelected,
  selectable,
  onClickNode,
  onToggle,
  onOpen,
}: {
  node: FsNode;
  isSelected: boolean;
  selectable: boolean;
  onClickNode: FileViewProps['onClickNode'];
  onToggle: FileViewProps['onToggle'];
  onOpen: FileViewProps['onOpen'];
}) {
  return (
    <div
      onClick={(e) => onClickNode(node, e)}
      onDoubleClick={() => onOpen(node)}
      title={node.name}
      className={cn(
        'group relative flex flex-col rounded-lg border cursor-pointer select-none transition-colors overflow-hidden',
        isSelected
          ? 'bg-primary/10 border-primary/60'
          : 'bg-card-background border-border hover:bg-card-background-hover'
      )}
    >
      {selectable && (
        <CheckBox
          checked={isSelected}
          onChange={() => onToggle(node)}
          className={cn('absolute z-10 left-2 top-2 transition-opacity', !isSelected && 'opacity-0 group-hover:opacity-100')}
        />
      )}
      <div className='h-28 flex items-center justify-center bg-background/40 border-b border-border/50'>
        {node.type === 'file' ? <Preview file={node} /> : <NodeIcon node={node} size={36} />}
      </div>
      <div className='px-2.5 py-2 min-w-0'>
        <div className='text-xs font-medium text-text-primary truncate'>{node.name}</div>
        <div className='text-[10px] text-text-secondary truncate'>{subtitle(node)}</div>
      </div>
    </div>
  );
}

/** Card grid (default view): images/videos/text are previewed right inside the card. */
export default function GridView({ nodes, selected, selectable, onClickNode, onToggle, onOpen }: FileViewProps) {
  if (nodes.length === 0) {
    return <div className='h-full min-h-[120px] flex items-center justify-center text-xs italic text-text-secondary'>Folder is empty.</div>;
  }

  return (
    <div className='grid gap-3 p-3' style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
      {nodes.map((node) => (
        <Card
          key={node.id}
          node={node}
          isSelected={selected.has(node.id)}
          selectable={selectable}
          onClickNode={onClickNode}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}