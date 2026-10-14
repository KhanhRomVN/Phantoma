import { Download, X } from 'lucide-react';
import { KIND_LABEL, formatDate, formatSize } from './fileTypes';
import type { FileNode } from './fileTypes';
import { downloadFile } from './fileStore';
import { NodeIcon } from './shared';
import MarkdownView from '../Markdown/Markdown';
import CodeView from '../Code/Code';

interface FileViewerProps {
  file: FileNode;
  onClose: () => void;
  /** Allow the download button (features.download). */
  canDownload?: boolean;
}

export function Body({ file }: { file: FileNode }) {
  if (file.kind === 'image' && file.url) {
    return <img src={file.url} alt={file.name} className='max-w-full max-h-full object-contain mx-auto' />;
  }
  if (file.kind === 'video' && file.url) {
    return <video src={file.url} controls className='max-w-full max-h-full mx-auto' />;
  }
  if (file.kind === 'audio' && file.url) {
    return <audio src={file.url} controls className='w-full' />;
  }
  if (file.kind === 'pdf' && file.url) {
    return <iframe src={file.url} title={file.name} className='w-full h-full border-0' />;
  }
  if (file.content !== undefined) {
    if (file.kind === 'markdown') return <MarkdownView content={file.content} />;
    // language = file extension; unknown languages are handled by CodeView itself
    return <CodeView content={file.content} language={file.ext || 'plaintext'} />;
  }
  return (
    <div className='h-full min-h-[160px] flex items-center justify-center text-xs italic text-text-secondary'>
      No preview available for this file type.
    </div>
  );
}

/** File viewer (read-only), overlays the content area of FileManager. */
export default function FileViewer({ file, onClose, canDownload = true }: FileViewerProps) {
  return (
    <div className='absolute inset-0 z-20 flex flex-col bg-background'>
      <div className='shrink-0 h-11 px-3 flex items-center gap-3 border-b border-border bg-card-background-hover'>
        <NodeIcon node={file} size={18} />
        <div className='min-w-0 flex-1'>
          <div className='text-sm font-medium text-text-primary truncate'>{file.name}</div>
          <div className='text-[10px] text-text-secondary truncate'>
            {KIND_LABEL[file.kind]} · {formatSize(file.size)} · {formatDate(file.modified)}
          </div>
        </div>
        {canDownload && (
          <button
            type='button'
            title='Download'
            onClick={() => downloadFile(file)}
            className='w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors'
          >
            <Download className='w-4 h-4' strokeWidth={1.5} />
          </button>
        )}
        <button
          type='button'
          title='Close'
          onClick={onClose}
          className='w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors'
        >
          <X className='w-4 h-4' strokeWidth={1.5} />
        </button>
      </div>
      <div className='flex-1 min-h-0 overflow-auto'>
        <Body file={file} />
      </div>
    </div>
  );
}