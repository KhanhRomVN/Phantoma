import React from 'react';
import { Archive } from 'lucide-react';

interface ZipState {
  isLoading: boolean;
  sizeBytes: number | null;
  error: string | null;
}

interface ClaudeZipBadgeProps {
  state: ZipState;
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const ClaudeZipBadge: React.FC<ClaudeZipBadgeProps> = ({ state }) => {
  const { isLoading, sizeBytes, error } = state;

  // Hide if not calculating and no size/error
  if (!isLoading && sizeBytes === null && !error) {
    return null;
  }

  let content: React.ReactNode;
  let color = 'var(--vscode-descriptionForeground)';
  let bg = 'transparent';

  if (isLoading) {
    content = <span>Zipping...</span>;
    color = '#3b82f6';
    bg = 'color-mix(in srgb, #3b82f6 10%, transparent)';
  } else if (error) {
    content = <span>Error</span>;
    color = '#ef4444';
    bg = 'color-mix(in srgb, #ef4444 10%, transparent)';
  } else if (sizeBytes !== null) {
    content = <span>{formatSize(sizeBytes)}</span>;
    color = '#10b981';
    bg = 'color-mix(in srgb, #10b981 10%, transparent)';
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        whiteSpace: 'nowrap',
        border: `1px solid ${color}40`,
      }}
      title={error ? `Zip error: ${error}` : `Workspace zip size: ${sizeBytes ? formatSize(sizeBytes) : 'N/A'}`}
    >
      <Archive size={10} />
      {content}
    </div>
  );
};