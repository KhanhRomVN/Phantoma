import React, { useState } from 'react';
import {
  FileIcon as FileIconLucide,
  Terminal,
  Loader2,
  AudioLines,
  Video,
  FileCode2,
  Sparkles,
} from 'lucide-react';
import { $ } from '@renderer/utils/color';
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';
import TextSnippetDrawer from './TextSnippetDrawer';
import { countTokens, formatTokenCount } from '@renderer/utils/tokenizer';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageFile = (t: string) => t.startsWith('image/');
const isVideoFile = (t: string) => t.startsWith('video/');
const isAudioFile = (t: string) => t.startsWith('audio/');
const isDocFile = (t: string) => !isImageFile(t) && !isVideoFile(t) && !isAudioFile(t);

// ─── Types ───────────────────────────────────────────────────────────────────

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
  type: 'file' | 'folder' | 'external' | 'text-snippet' | 'skill' | 'rule' | 'terminal';
  content?: string;
  lineCount?: number;
}

interface FilesPreviewsProps {
  uploadedFiles: UploadedFile[];
  attachedItems: AttachedItem[];
  onRemoveFile: (id: string) => void;
  onRemoveAttachedItem: (id: string) => void;
  onOpenImage: (file: UploadedFile) => void;
  onAttachedItemClick: (item: AttachedItem) => void;
  readOnly?: boolean;
}

// ─── RemoveButton ────────────────────────────────────────────────────────────

const RemoveButton: React.FC<{ onRemove: () => void }> = ({ onRemove }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      onRemove();
    }}
    style={{
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2px',
      flexShrink: 0,
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
);

// ─── BaseCard ────────────────────────────────────────────────────────────────

interface BaseCardProps {
  id: string;
  name: string;
  size: number;
  isUploading?: boolean;
  error?: string;
  readOnly?: boolean;
  onRemove: (id: string) => void;
  color: string;
  icon: React.ReactNode;
}

const BaseCard: React.FC<BaseCardProps> = ({
  id,
  name,
  size,
  isUploading,
  error,
  readOnly,
  onRemove,
  color,
  icon,
}) => {
  const lastDot = name.lastIndexOf('.');
  const baseName = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : '';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 8px',
        borderRadius: '6px',
        border: error
          ? `1px solid ${$('--error')}`
          : `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
        opacity: isUploading ? 0.6 : 1,
        width: '192px',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
      title={error || name}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
          color: error ? $('--error') : color,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: $('--text-primary'),
            display: 'flex',
            alignItems: 'baseline',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: '0 1 auto',
            }}
          >
            {baseName}
          </span>
          {ext && <span style={{ color, flexShrink: 0, whiteSpace: 'nowrap' }}>{ext}</span>}
        </div>
        <div style={{ fontSize: '10px', color: $('--text-secondary'), marginTop: '1px' }}>
          {isUploading ? 'uploading...' : error ? '\u26A0\uFE0F error' : formatFileSize(size)}
        </div>
      </div>
      {!readOnly && <RemoveButton onRemove={() => onRemove(id)} />}
    </div>
  );
};

const AUDIO_COLOR = $('--warn');
const VIDEO_COLOR = $('--violet');
const FILE_COLOR = $('--success');

const AudioCard: React.FC<Omit<BaseCardProps, 'color' | 'icon'>> = (p) => (
  <BaseCard {...p} color={AUDIO_COLOR} icon={<AudioLines size={14} />} />
);
const VideoCard: React.FC<Omit<BaseCardProps, 'color' | 'icon'>> = (p) => (
  <BaseCard {...p} color={VIDEO_COLOR} icon={<Video size={14} />} />
);

const FileIconBadge: React.FC<{ filename: string }> = ({ filename }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError) return <FileCode2 size={14} />;
  return (
    <img
      src={getFileIconPath(filename)}
      alt=""
      width={14}
      height={14}
      style={{ objectFit: 'contain' }}
      onError={() => setHasError(true)}
    />
  );
};

const FileCard: React.FC<Omit<BaseCardProps, 'color' | 'icon'>> = (p) => (
  <BaseCard {...p} color={FILE_COLOR} icon={<FileIconBadge filename={p.name} />} />
);

// ─── Section ─────────────────────────────────────────────────────────────────

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: '8px' }}>
    <div style={{ fontSize: '10px', color: $('--text-secondary'), marginBottom: '4px' }}>
      {label}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{children}</div>
  </div>
);

const RemoveX: React.FC<{ onClick: (e: React.MouseEvent) => void }> = ({ onClick }) => (
  <div
    onClick={onClick}
    style={{
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2px',
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
);

// ─── FilesPreviews ───────────────────────────────────────────────────────────

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

  const images = uploadedFiles.filter((f) => isImageFile(f.type));
  const videos = uploadedFiles.filter((f) => isVideoFile(f.type));
  const audios = uploadedFiles.filter((f) => isAudioFile(f.type));
  const docs = uploadedFiles.filter((f) => isDocFile(f.type));

  const fileItems = attachedItems.filter((i) => i.type === 'file');
  const folderItems = attachedItems.filter((i) => i.type === 'folder');
  const externalItems = attachedItems.filter((i) => i.type === 'external');
  const terminalItems = attachedItems.filter((i) => i.type === 'terminal');
  const snippetItems = attachedItems.filter((i) => i.type === 'text-snippet');
  const skillItems = attachedItems.filter((i) => i.type === 'skill');

  if (uploadedFiles.length === 0 && attachedItems.length === 0) return null;

  return (
    <>
      <div
        style={{
          padding: readOnly ? '8px 0' : '8px 16px',
          borderTop: readOnly ? 'none' : `1px solid ${$('--border')}`,
          backgroundColor: $('--card-background'),
        }}
      >
        {images.length > 0 && (
          <Section label="Images:">
            {images.map((file) => (
              <div
                key={file.id}
                onClick={() => {
                  (window as any).api
                    ?.invoke?.('media:open-temp-image', {
                      content: file.content,
                      filename: file.name,
                    })
                    .catch(() => {});
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
                    border: file.error ? `1px solid ${$('--error')}` : `1px solid ${$('--border')}`,
                    opacity: file.isUploading ? 0.5 : 1,
                    filter: file.isUploading ? 'blur(0.5px)' : 'none',
                    pointerEvents: 'none',
                  }}
                />
                {file.isUploading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.4)',
                      borderRadius: '6px',
                      pointerEvents: 'none',
                    }}
                  >
                    <Loader2 size={16} color={$('--text-primary')} className="spin-animation" />
                  </div>
                )}
                {file.error && (
                  <div
                    title={file.error}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `color-mix(in srgb, ${$('--error')} 60%, transparent)`,
                      borderRadius: '6px',
                      color: $('--text-primary'),
                      fontSize: '12px',
                      pointerEvents: 'none',
                    }}
                  >
                    \u26A0\uFE0F
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
                      backgroundColor: $('--card-background'),
                      border: `1px solid ${$('--border')}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 10,
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
            ))}
          </Section>
        )}

        {videos.length > 0 && (
          <Section label="Videos:">
            {videos.map((f) => (
              <VideoCard
                key={f.id}
                id={f.id}
                name={f.name}
                size={f.size}
                isUploading={f.isUploading}
                error={f.error}
                readOnly={readOnly}
                onRemove={onRemoveFile}
              />
            ))}
          </Section>
        )}

        {audios.length > 0 && (
          <Section label="Audio:">
            {audios.map((f) => (
              <AudioCard
                key={f.id}
                id={f.id}
                name={f.name}
                size={f.size}
                isUploading={f.isUploading}
                error={f.error}
                readOnly={readOnly}
                onRemove={onRemoveFile}
              />
            ))}
          </Section>
        )}

        {(docs.length > 0 ||
          fileItems.length > 0 ||
          folderItems.length > 0 ||
          externalItems.length > 0) && (
          <Section label="Files:">
            {docs.map((f) => (
              <FileCard
                key={f.id}
                id={f.id}
                name={f.name}
                size={f.size}
                isUploading={f.isUploading}
                error={f.error}
                readOnly={readOnly}
                onRemove={onRemoveFile}
              />
            ))}
            {fileItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  color: $('--text-secondary'),
                  cursor: 'pointer',
                }}
                onClick={() => onAttachedItemClick(item)}
                title={`Click to open: ${item.path}`}
              >
                <FileIconLucide path={item.path} style={{ width: '14px', height: '14px' }} />
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
                  <RemoveX
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAttachedItem(item.id);
                    }}
                  />
                )}
              </div>
            ))}
            {folderItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  color: $('--text-secondary'),
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
                  <RemoveX
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAttachedItem(item.id);
                    }}
                  />
                )}
              </div>
            ))}
            {externalItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  color: $('--text-secondary'),
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
                  {item.path.split('/').pop() || item.path.split('\\').pop() || item.path}
                </span>
                {!readOnly && (
                  <RemoveX
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAttachedItem(item.id);
                    }}
                  />
                )}
              </div>
            ))}
          </Section>
        )}

        {terminalItems.length > 0 && (
          <Section label="Terminals:">
            {terminalItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  color: $('--text-secondary'),
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
                  <RemoveX
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAttachedItem(item.id);
                    }}
                  />
                )}
              </div>
            ))}
          </Section>
        )}

        {skillItems.length > 0 && (
          <Section label="Skills:">
            {skillItems.map((item) => (
              <div
                key={item.id}
                title={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: `1px solid color-mix(in srgb, ${$('--purple')} 20%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${$('--purple')} 8%, transparent)`,
                  maxWidth: '192px',
                  boxSizing: 'border-box',
                  flexShrink: 0,
                }}
              >
                <span style={{ display: 'inline-flex', color: $('--purple'), flexShrink: 0 }}>
                  <Sparkles size={13} />
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: $('--text-primary'),
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.path}
                </span>
                {!readOnly && (
                  <RemoveX
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAttachedItem(item.id);
                    }}
                  />
                )}
              </div>
            ))}
          </Section>
        )}

        {snippetItems.length > 0 && (
          <Section label="Text Snippets:">
            {snippetItems.map((item, index) => {
              const tokenCount = item.content ? countTokens(item.content) : 0;
              const SNIPPET_COLOR = $('--blue');
              const preview = (item.content || '').trim().slice(0, 60).replace(/\n/g, ' ');
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: `1px solid color-mix(in srgb, ${SNIPPET_COLOR} 20%, transparent)`,
                    backgroundColor: `color-mix(in srgb, ${SNIPPET_COLOR} 8%, transparent)`,
                    width: '192px',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleTextSnippetClick(item, index)}
                  title={item.content || ''}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: `color-mix(in srgb, ${SNIPPET_COLOR} 15%, transparent)`,
                      color: SNIPPET_COLOR,
                      flexShrink: 0,
                    }}
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
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: $('--text-primary'),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {preview || `Snippet_${index + 1}`}
                    </div>
                    <div
                      style={{ fontSize: '10px', color: $('--text-secondary'), marginTop: '1px' }}
                    >
                      {formatTokenCount(tokenCount)} tokens
                    </div>
                  </div>
                  {!readOnly && (
                    <RemoveX
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAttachedItem(item.id);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </Section>
        )}
      </div>

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
