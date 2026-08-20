/**
 * ------------------------------------------------------------------
 * FileIcon
 * ------------------------------------------------------------------
 * Hiển thị icon cho file hoặc thư mục dựa trên đường dẫn.
 * Tự động chuyển sang icon fallback khi không tìm thấy icon phù hợp.
 *
 * Main features:
 * - Xác định icon cho file/thư mục từ đường dẫn
 * - Hỗ trợ trạng thái mở/đóng cho thư mục
 * - Tự động fallback khi icon không load được
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useState, useEffect } from 'react';

// ── Utils ──
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface FileIconProps {
  path: string;
  isFolder?: boolean;
  isOpen?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// ─── Component ──────────────────────────────────────────────────────────
const FileIcon: React.FC<FileIconProps> = ({
  path,
  isFolder = false,
  isOpen = false,
  className,
  style,
}) => {
  // ── State ──
  const [hasError, setHasError] = useState(false);

  // ── Effects ──
  // Reset trạng thái lỗi khi props thay đổi
  useEffect(() => {
    setHasError(false);
  }, [path, isFolder, isOpen]);

  // ── Handlers ──
  const getTargetSrc = () => {
    if (isFolder) {
      return getFolderIconPath(path, isOpen);
    }
    return getFileIconPath(path);
  };

  const getFallbackSrc = () => {
    if (isFolder) {
      return getFolderIconPath('', false);
    }
    return getFileIconPath('default_file');
  };

  const handleError = () => {
    if (!hasError) {
      logger.warn(
        `[FileIcon] Không load được icon: ${src} cho path: ${path}. Chuyển sang fallback.`,
      );
      setHasError(true);
    }
  };

  // ── Derived ──
  const src = hasError ? getFallbackSrc() : getTargetSrc();

  // ── Render ──
  return (
    <img
      src={src}
      alt={isFolder ? 'folder' : 'file'}
      className={className}
      style={style}
      onError={handleError}
    />
  );
};

export default FileIcon;
