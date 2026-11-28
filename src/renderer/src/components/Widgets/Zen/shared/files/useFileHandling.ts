/**
 * ------------------------------------------------------------------
 * useFileHandling
 * ------------------------------------------------------------------
 * Hook quản lý việc upload file (paste, select, drag-drop) và
 * external files cho Agent Chat.
 *
 * Main features:
 * - Upload file lên server với progress tracking
 * - Hỗ trợ paste ảnh từ clipboard
 * - Validate file extension và đọc nội dung text
 * - Quản lý external files với drag-drop
 * ------------------------------------------------------------------
 */

import React, { useState, useRef } from 'react';

// CONTEXT
import { useSettings } from '../../context/SettingsContext';

// TYPES
import { UploadedFile, ExternalFile, AttachedItem } from './file.types';
import { uploadFileToBackend } from './file-upload.service';
import { isFileAllowed, readFileAsText } from '../../features/chat/utils/file_operations';
import { ALLOWED_FILE_EXTENSIONS } from '../../features/chat/constants/file_extensions';

// UTILS

// ── Constants ──

interface UseFileHandlingProps {
  accountId?: string;
  onAddAttachedItem: (item: AttachedItem) => void;
}

export const useFileHandling = ({ accountId, onAddAttachedItem }: UseFileHandlingProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [externalFiles, setExternalFiles] = useState<ExternalFile[]>([]);
  const [invalidExternalFiles, setInvalidExternalFiles] = useState<
    { name: string; path: string; reason: string }[]
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const externalFileInputRef = useRef<HTMLInputElement>(null);

  const { apiUrl } = useSettings();

  const uploadFileToServer = async (file: UploadedFile) => {
    if (!apiUrl || !accountId) {
      console.error(
        `[useFileHandling] Upload failed: apiUrl="${apiUrl}", accountId="${accountId}"`,
      );
      return;
    }

    // Set status to uploading
    setUploadedFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, isUploading: true } : f)),
    );

    try {
      const fileId = await uploadFileToBackend({ apiUrl, accountId, file });
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, file_id: fileId, isUploading: false } : f)),
      );
    } catch (err: any) {
      console.error(`[useFileHandling] Upload exception:`, err);
      console.error(`[useFileHandling] Error message: ${err.message}`);
      console.error(`[useFileHandling] Error stack: ${err.stack}`);

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, isUploading: false, error: err.message || String(err) } : f,
        ),
      );
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    let hasImage = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          hasImage = true;

          const reader = new FileReader();
          reader.onload = (event) => {
            const content = event.target?.result as string;
            const newFile: UploadedFile = {
              id: `file-${Date.now()}-${Math.random()}`,
              name: file.name,
              size: file.size,
              type: file.type,
              content: content,
            };
            setUploadedFiles((prev) => [...prev, newFile]);
            uploadFileToServer(newFile);
          };

          reader.onerror = (error) => {
            console.error('[useFileHandling] FileReader error:', error);
          };

          reader.readAsDataURL(file);
        } else {
          console.warn(`[useFileHandling] Item ${i} is image but getAsFile() returned null`);
        }
      }
    }

    if (hasImage) {
      e.preventDefault();
    }
  };

  const handleFileSelect = async () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Check if textOnly mode is set on the input element
    const textOnly = (e.target as any).dataset?.textOnly === 'true';

    const newFiles: UploadedFile[] = [];
    const invalidFiles: { name: string; reason: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // If textOnly mode, filter out image files
      if (textOnly && file.type.startsWith('image/')) {
        invalidFiles.push({
          name: file.name,
          reason: 'Image files are not allowed when upload is disabled',
        });
        continue;
      }

      const reader = new FileReader();

      await new Promise<void>((resolve) => {
        reader.onload = () => {
          const content = reader.result as string;
          const newFile: UploadedFile = {
            id: `file-${Date.now()}-${i}`,
            name: file.name,
            size: file.size,
            type: file.type,
            content: content,
          };
          newFiles.push(newFile);
          resolve();
        };

        if (file.type.startsWith('image/')) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });
    }

    if (invalidFiles.length > 0) {
      const message = `Cannot add file(s):\n${invalidFiles.map((f) => `• ${f.name}: ${f.reason}`).join('\n')}`;
      alert(message);
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => uploadFileToServer(file));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      // Clean up the dataset flag
      delete (fileInputRef.current as any).dataset.textOnly;
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleExternalFileSelect = () => {
    if (externalFileInputRef.current) {
      externalFileInputRef.current.click();
    }
  };

  const handleExternalFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newInvalidFiles: { name: string; path: string; reason: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file extension
      if (!isFileAllowed(file.name)) {
        newInvalidFiles.push({
          name: file.name,
          path: (file as any).path || file.webkitRelativePath || file.name,
          reason: `File type "${file.name.substring(file.name.lastIndexOf('.'))}" is not supported. Allowed: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`,
        });
        continue;
      }

      try {
        // Read file content - if this fails, file is not readable as text
        const content = await readFileAsText(file);

        // Get full path (webkitRelativePath or name)
        const fullPath = (file as any).path || file.webkitRelativePath || file.name;

        const externalFile: ExternalFile = {
          id: `external-${Date.now()}-${i}`,
          name: file.name,
          path: fullPath,
          content: content,
          size: file.size,
        };

        setExternalFiles((prev) => [...prev, externalFile]);

        // Add to attached items
        const attachedItem: AttachedItem = {
          id: externalFile.id,
          path: fullPath,
          type: 'external',
        };
        onAddAttachedItem(attachedItem);
      } catch (error) {
        // File is not readable as text
        newInvalidFiles.push({
          name: file.name,
          path: (file as any).path || file.webkitRelativePath || file.name,
          reason: `Cannot read "${file.name}" as text. The file may be binary, corrupted, or too large.`,
        });
      }
    }

    if (newInvalidFiles.length > 0) {
      setInvalidExternalFiles((prev) => [...prev, ...newInvalidFiles]);
      // Show warning to user
      alert(
          `Cannot add file(s):\n${newInvalidFiles.map((f) => `• ${f.name}: ${f.reason}`).join('\n')}`,
        );
    }

    // Reset input
    if (externalFileInputRef.current) {
      externalFileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!isFileAllowed(file.name)) {
        continue;
      }

      try {
        const content = await readFileAsText(file);
        const fullPath = (file as any).path || file.webkitRelativePath || file.name;

        const externalFile: ExternalFile = {
          id: `external-${Date.now()}-${i}`,
          name: file.name,
          path: fullPath,
          content: content,
          size: file.size,
        };

        setExternalFiles((prev) => [...prev, externalFile]);

        const attachedItem: AttachedItem = {
          id: externalFile.id,
          path: fullPath,
          type: 'external',
        };
        onAddAttachedItem(attachedItem);
      } catch (error) {
        console.warn('[useFileHandling] Failed to add attached item:', error);
      }
    }
  };

  const clearFiles = () => {
    setUploadedFiles([]);
    setExternalFiles([]);
    setInvalidExternalFiles([]);
  };

  const clearInvalidExternalFiles = () => {
    setInvalidExternalFiles([]);
  };

  return {
    uploadedFiles,
    externalFiles,
    invalidExternalFiles,
    fileInputRef,
    externalFileInputRef,
    handlePaste,
    handleFileSelect,
    handleFileInputChange,
    removeFile,
    handleExternalFileSelect,
    handleExternalFileInputChange,
    handleDragOver,
    handleDrop,
    clearFiles,
    clearInvalidExternalFiles,
  };
};
