import { KIND_LABEL, formatDate, formatSize } from '../FileManager/fileTypes';
import { getFileSystem } from '../FileManager/fileStore';
import { Body } from '../FileManager/FileViewer';
import { NodeIcon } from '../FileManager/shared';

interface Props {
  file?: string;
}

export default function Pin({ file }: Props) {
  if (!file) return <div className="p-4 text-sm text-red-400">Thiếu tham số file=...</div>;

  const node = getFileSystem().byPath.get(file);
  if (!node || node.type !== 'file') {
    return <div className="p-4 text-sm text-red-400">Không tìm thấy file: {file}</div>;
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border/50 text-[11px]">
        <NodeIcon node={node} size={14} />
        <span className="font-mono text-text-primary truncate">{node.path}</span>
        <span className="text-text-secondary truncate">
          {KIND_LABEL[node.kind]} · {formatSize(node.size)} · {formatDate(node.modified)}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <Body file={node} />
      </div>
    </div>
  );
}