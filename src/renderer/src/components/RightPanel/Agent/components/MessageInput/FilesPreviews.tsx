import React, { useState } from 'react';
import { FileIcon as FileIconLucide, Terminal, Loader2, Sparkles } from 'lucide-react';
import TextSnippetDrawer from './TextSnippetDrawer';
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  file_id?: string;
  isUploading?: boolean;
  error?: string;
}

interface AttachedItem {
  id: string;
  path: string;
  type: 'file' | 'folder' | 'external' | 'text-snippet' | 'skill';
  content?: string;
  lineCount?: number;
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
  readOnly?: boolean;
}

const FilesPreviews: React.FC<FilesPreviewsProps> = ({
  uploadedFiles,
  attachedItems,
  onRemoveFile,
  onRemoveAttachedItem,
  onOpenImage,
  onAttachedItemClick,
  readOnly = false,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState('');
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerSnippetNumber, setDrawerSnippetNumber] = useState<number | undefined>(undefined);
  const [drawerLineCount, setDrawerLineCount] = useState<number | undefined>(undefined);

  const handleTextSnippetClick = (item: AttachedItem, index: number) => {
    setDrawerTitle(item.path);
    setDrawerContent(item.content || '');
    setDrawerSnippetNumber(index + 1);
    setDrawerLineCount(item.lineCount);
    setDrawerOpen(true);
    onAttachedItemClick(item);
  };

  return (
    <>
      {uploadedFiles.length > 0 && (
        <div
          style={{
            padding: readOnly
              ? '8px 0'
              : '8px 16px',
            borderTop: readOnly ? 'none' : '1px solid rgba(255,255,255,0.1)', // border-border
            backgroundColor: '#1e1e1e', // bg-card-background
          }}
        >
          {uploadedFiles.filter((file) => file.type.startsWith('image/')).length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <div
                style={{
                  fontSize: '10px',
                  color: '#8b8b8b', // text-text-secondary
                  marginBottom: '4px',
                }}
              >
                Images:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  gap: '4px',
                  maxHeight: '80px',
                }}
              >
                {uploadedFiles
                  .filter((file) => file.type.startsWith('image/'))
                  .map((file) => {
                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          const vscodeApi = (window as any).vscodeApi;
                          if (vscodeApi) {
                            vscodeApi.postMessage({
                              command: 'openTempImage',
                              content: file.content,
                              filename: file.name,
                            });
                          }
                          onOpenImage(file);
                        }}
                        style={{
                          position: 'relative',
                          width: '40px',
                          height: '40px',
                          flexShrink: 0,
                          cursor: 'pointer',
                        }}
                      >
                        <img
                          src={file.content}
                          alt={file.name}
                          title={file.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: file.error
                              ? '1px solid #f44336' // text-error
                              : '1px solid rgba(255,255,255,0.1)', // border-border
                            opacity: file.isUploading ? 0.5 : 1,
                            filter: file.isUploading ? 'blur(0.5px)' : 'none',
                            pointerEvents: 'none',
                          }}
                        />
                        {file.isUploading && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'rgba(0, 0, 0, 0.4)',
                              borderRadius: '6px',
                              pointerEvents: 'none',
                            }}
                          >
                            <Loader2
                              size={16}
                              color="#ffffff" // text-text-primary
                              className="spin-animation"
                            />
                          </div>
                        )}
                        {file.error && (
                          <div
                            title={file.error}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'rgba(244, 67, 54, 0.6)',
                              borderRadius: '6px',
                              color: '#ffffff', // text-text-primary
                              fontSize: '12px',
                              fontWeight: 'bold',
                              pointerEvents: 'none',
                            }}
                          >
                            ⚠️
                          </div>
                        )}
                        {!readOnly && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFile(file.id);
                            }}
                            style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              backgroundColor: '#1e1e1e', // bg-card-background
                              border: '1px solid rgba(255,255,255,0.1)', // border-border
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              zIndex: 10,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}
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
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {uploadedFiles.filter((file) => !file.type.startsWith('image/')).length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <div
                style={{
                  fontSize: '10px',
                  color: '#8b8b8b', // text-text-secondary
                  marginBottom: '4px',
                }}
              >
                Files:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}
              >
                {uploadedFiles
                  .filter((file) => !file.type.startsWith('image/'))
                  .map((file) => (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: file.error
                          ? '1px solid #f44336' // text-error
                          : 'none',
                        borderRadius: '6px',
                        fontSize: '10px',
                        color: file.error
                          ? '#f44336' // text-error
                          : '#ffffff', // text-text-primary
                        opacity: file.isUploading ? 0.6 : 1,
                      }}
                    >
                      <span>📎</span>
                      <span
                        style={{
                          maxWidth: '150px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={file.error || file.name}
                      >
                        {file.name}
                      </span>
                      <span style={{ color: '#8b8b8b' }}> // text-text-secondary
                        ({formatFileSize(file.size)})
                      </span>
                      {file.isUploading && (
                        <span style={{ fontSize: '10px', color: '#8b8b8b' }}> // text-text-secondary
                          (uploading...)
                        </span>
                      )}
                      {file.error && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#f44336', // text-error
                          }}
                          title={file.error}
                        >
                          ⚠️
                        </span>
                      )}
                      {!readOnly && (
                        <div
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px',
                          }}
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
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {attachedItems.length > 0 && (
        <div
          style={{
            padding: readOnly
              ? '8px 0'
              : '8px 16px',
            borderTop: readOnly
              ? 'none'
              : uploadedFiles.length === 0
                ? '1px solid rgba(255,255,255,0.1)' // border-border
                : 'none',
            backgroundColor: '#1e1e1e', // bg-card-background
          }}
        >
          {attachedItems.filter((item) => item.type === 'file').length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <div
                style={{
                  fontSize: '10px',
                  color: '#8b8b8b', // text-text-secondary
                  marginBottom: '4px',
                }}
              >
                Files:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}
              >
                {attachedItems
                  .filter((item) => item.type === 'file')
                  .map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '10px',
                        color: '#8b8b8b', // text-text-secondary
                        cursor: 'pointer',
                      }}
                      onClick={() => onAttachedItemClick(item)}
                      title={`Click to open: ${item.path}`}
                    >
                      <FileIconLucide
                        path={item.path}
                        style={{ width: '14px', height: '14px' }}
                      />
                      <span
                        style={{
                          maxWidth: '150px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.path.split('/').pop()}
                      </span>
                      {!readOnly && (
                        <div
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px',
                          }}
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
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {attachedItems.filter((item) => item.type === 'folder').length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <div
                style={{
                  fontSize: '10px',
                  color: '#8b8b8b', // text-text-secondary
                  marginBottom: '4px',
                }}
              >
                Folders:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}
              >
                {attachedItems
                  .filter((item) => item.type === 'folder')
                  .map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '10px',
                        color: '#8b8b8b', // text-text-secondary
                        cursor: 'pointer',
                      }}
                      onClick={() => onAttachedItemClick(item)}
                      title={item.path}
                    >
                      <img
                        src={getFolderIconPath(item.path)}
                        alt=""
                        style={{ width: '14px', height: '14px' }}
                      />
                      <span
                        style={{
                          maxWidth: '150px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.path.split('/').pop() || item.path}
                      </span>
                      {!readOnly && (
                        <div
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px',
                          }}
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
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {attachedItems.filter((item) => item.type === 'external').length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <div
                style={{
                  fontSize: '10px',
                  color: '#8b8b8b', // text-text-secondary
                  marginBottom: '4px',
                }}
              >
                External Files:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}
              >
                {attachedItems
                  .filter((item) => item.type === 'external')
                  .map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '10px',
                        color: '#8b8b8b', // text-text-secondary
                        cursor: 'pointer',
                      }}
                      onClick={() => onAttachedItemClick(item)}
                      title={`External file: ${item.path}`}
                    >
                      <img
                        src={getFileIconPath(item.path)}
                        alt=""
                        style={{ width: '14px', height: '14px' }}
                      />
                      <span
                        style={{
                          maxWidth: '150px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.path.split('/').pop() ||
                          item.path.split('\\').pop() ||
                          item.path}
                      </span>
                      {!readOnly && (
                        <div
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px',
                          }}
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
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {attachedItems.filter((item) => item.type === 'skill').length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <div
                style={{
                  fontSize: '10px',
                  color: '#8b8b8b', // text-text-secondary
                  marginBottom: '4px',
                }}
              >
                Skills:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}
              >
                {attachedItems
                  .filter((item) => item.type === 'skill')
                  .map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '6px',
                        fontSize: '10px',
                        color: '#a78bfa',
                        cursor: 'pointer',
                      }}
                      onClick={() => onAttachedItemClick(item)}
                      title={`Skill: ${item.path}`}
                    >
                      <Sparkles size={12} />
                      <span
                        style={{
                          maxWidth: '150px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.path}
                      </span>
                      {!readOnly && (
                        <div
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px',
                          }}
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
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {attachedItems.filter((item) => item.type === ('terminal' as any)).length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <div
                style={{
                  fontSize: '10px',
                  color: '#8b8b8b', // text-text-secondary
                  marginBottom: '4px',
                }}
              >
                Terminals:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}
              >
                {attachedItems
                  .filter((item) => item.type === ('terminal' as any))
                  .map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '10px',
                        color: '#8b8b8b', // text-text-secondary
                        cursor: 'pointer',
                      }}
                      onClick={() => onAttachedItemClick(item)}
                      title={`Terminal ID: ${item.path}`}
                    >
                      <Terminal size={14} />
                      <span
                        style={{
                          maxWidth: '150px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.path}
                      </span>
                      {!readOnly && (
                        <div
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px',
                          }}
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
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {attachedItems.filter((item) => item.type === 'text-snippet').length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#8b8b8b', // text-text-secondary
                  marginBottom: '4px',
                }}
              >
                Text Snippets:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}
              >
                {attachedItems
                  .filter((item) => item.type === 'text-snippet')
                  .map((item, index) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor:
                          'rgba(128, 128, 128, 0.1)', // bg-card-background approximate
                        border:
                          '1px solid rgba(255,255,255,0.1)', // border-border
                        borderRadius: '6px',
                        fontSize: '10px',
                        color: '#ffffff', // text-text-primary
                        cursor: 'pointer',
                      }}
                      onClick={() => handleTextSnippetClick(item, index)}
                      title={`Large text snippet: ${item.content?.substring(0, 100)}...`}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="10" y1="9" x2="8" y2="9" />
                      </svg>
                      <span
                        style={{
                          maxWidth: '150px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Snippet[{index + 1}] ({item.lineCount || 0} lines)
                      </span>
                      {!readOnly && (
                        <div
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px',
                          }}
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
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      <TextSnippetDrawer
        isOpen={drawerOpen}
        content={drawerContent}
        title={drawerTitle}
        snippetNumber={drawerSnippetNumber}
        lineCount={drawerLineCount}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
};

export default FilesPreviews;