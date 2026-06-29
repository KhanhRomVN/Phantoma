import React from 'react';
import { FileIcon as FileIconLucide, Terminal, Loader2 } from 'lucide-react';
import FileIcon from '@renderer/components/common/FileIcon';
import { cn } from '@renderer/shared/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string; // Base64 or text content
  file_id?: string;
  isUploading?: boolean;
  error?: string;
}

interface AttachedItem {
  id: string;
  path: string;
  type: 'file' | 'folder' | 'external';
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

interface FilesPreviewsProps {
  uploadedFiles: UploadedFile[];
  attachedItems: AttachedItem[];
  onRemoveFile: (id: string) => void;
  onRemoveAttachedItem: (id: string) => void;
  onOpenImage: (file: UploadedFile) => void;
  onAttachedItemClick: (item: AttachedItem) => void;
}

const FilesPreviews: React.FC<FilesPreviewsProps> = ({
  uploadedFiles,
  attachedItems,
  onRemoveFile,
  onRemoveAttachedItem,
  onOpenImage,
  onAttachedItemClick,
}) => {
  return (
    <>
      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-nowrap overflow-x-auto gap-1 max-h-[80px] px-3 py-2 border-t border-[var(--border-color)] bg-transparent">
          {uploadedFiles.map((file) => {
            const isImage = file.type.startsWith('image/');
            if (isImage) {
              return (
                <div key={file.id} className="relative w-10 h-10 shrink-0">
                  <img
                    src={file.content}
                    alt={file.name}
                    title={file.name}
                    onClick={() => !file.isUploading && onOpenImage(file)}
                    className={cn(
                      'w-full h-full object-cover rounded',
                      file.isUploading
                        ? 'cursor-default opacity-50 blur-[0.5px]'
                        : 'cursor-pointer opacity-100',
                      file.error
                        ? 'border border-[var(--vscode-errorForeground,#f44336)]'
                        : 'border border-[var(--border-color)]',
                    )}
                  />
                  {file.isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded pointer-events-none bg-black/40">
                      <Loader2
                        size={16}
                        color="var(--vscode-editor-foreground, #ffffff)"
                        className="spin-animation"
                      />
                    </div>
                  )}
                  {file.error && (
                    <div
                      title={file.error}
                      className="absolute inset-0 flex items-center justify-center rounded text-xs font-bold cursor-help bg-[rgba(244,67,54,0.6)] text-[var(--vscode-editor-foreground,#fff)]"
                    >
                      ⚠️
                    </div>
                  )}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(file.id);
                    }}
                    className="absolute -top-1 -right-1 w-[14px] h-[14px] rounded-full flex items-center justify-center cursor-pointer z-10 bg-[var(--secondary-bg)] border border-[var(--border-color)] shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                  >
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs bg-transparent',
                  file.error
                    ? 'border border-[var(--vscode-errorForeground,#f44336)] text-[var(--vscode-errorForeground,#f44336)]'
                    : 'border-none text-[var(--primary-text)]',
                  file.isUploading && 'opacity-60',
                )}
              >
                <span>📎</span>
                <span
                  className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap"
                  title={file.error || file.name}
                >
                  {file.name}
                </span>
                <span className="text-[var(--secondary-text)]">({formatFileSize(file.size)})</span>
                {file.isUploading && (
                  <span className="text-[10px] text-[var(--secondary-text)]">(uploading...)</span>
                )}
                {file.error && (
                  <span
                    className="text-[10px] text-[var(--vscode-errorForeground,#f44336)]"
                    title={file.error}
                  >
                    ⚠️
                  </span>
                )}
                <div
                  className="flex items-center justify-center p-0.5 cursor-pointer"
                  onClick={() => onRemoveFile(file.id)}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attached Items Display Area (Files/Folders from @ mention) */}
      {attachedItems.length > 0 && (
        <div className="px-3 py-2 border-t border-[var(--border-color)] bg-transparent">
          {/* Files Row */}
          {attachedItems.filter((item) => item.type === 'file').length > 0 && (
            <div className="mb-1">
              <div className="text-xs mb-1 text-[var(--secondary-text)]">Files:</div>
              <div className="flex flex-wrap gap-1">
                {attachedItems
                  .filter((item) => item.type === 'file')
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer bg-transparent border-none text-[var(--secondary-text)]"
                      onClick={() => onAttachedItemClick(item)}
                      title={`Click to open: ${item.path}`}
                    >
                      <FileIconLucide path={item.path} style={{ width: '14px', height: '14px' }} />
                      <span className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.path.split('/').pop()}
                      </span>
                      <div
                        className="flex items-center justify-center p-0.5 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveAttachedItem(item.id);
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Folders Row */}
          {attachedItems.filter((item) => item.type === 'folder').length > 0 && (
            <div className="mb-1">
              <div className="text-xs mb-1 text-[var(--secondary-text)]">Folders:</div>
              <div className="flex flex-wrap gap-1">
                {attachedItems
                  .filter((item) => item.type === 'folder')
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer bg-transparent border-none text-[var(--secondary-text)]"
                      onClick={() => onAttachedItemClick(item)}
                      title={item.path}
                    >
                      <FileIcon
                        path={item.path}
                        isFolder={true}
                        style={{ width: '14px', height: '14px' }}
                      />
                      <span className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.path.split('/').pop() || item.path}
                      </span>
                      <div
                        className="flex items-center justify-center p-0.5 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveAttachedItem(item.id);
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* External Files Row */}
          {attachedItems.filter((item) => item.type === 'external').length > 0 && (
            <div className="mb-1">
              <div className="text-xs mb-1 text-[var(--secondary-text)]">External Files:</div>
              <div className="flex flex-wrap gap-1">
                {attachedItems
                  .filter((item) => item.type === 'external')
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer bg-transparent border-none text-[var(--secondary-text)]"
                      onClick={() => onAttachedItemClick(item)}
                      title={`External file: ${item.path}`}
                    >
                      <FileIcon path={item.path} style={{ width: '14px', height: '14px' }} />
                      <span className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.path.split('/').pop() || item.path.split('\\').pop() || item.path}
                      </span>
                      <div
                        className="flex items-center justify-center p-0.5 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveAttachedItem(item.id);
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Terminals Row */}
          {attachedItems.filter((item) => item.type === ('terminal' as any)).length > 0 && (
            <div className="mb-1">
              <div className="text-xs mb-1 text-[var(--secondary-text)]">Terminals:</div>
              <div className="flex flex-wrap gap-1">
                {attachedItems
                  .filter((item) => item.type === ('terminal' as any))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer bg-transparent border-none text-[var(--secondary-text)]"
                      onClick={() => onAttachedItemClick(item)}
                      title={`Terminal ID: ${item.path}`}
                    >
                      <Terminal size={14} />
                      <span className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.path}
                      </span>
                      <div
                        className="flex items-center justify-center p-0.5 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveAttachedItem(item.id);
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FilesPreviews;
