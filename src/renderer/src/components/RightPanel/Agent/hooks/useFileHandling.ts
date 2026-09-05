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

import { logger } from '@renderer/utils/logger';
import React, { useState, useRef } from 'react';

// CONTEXT
import { useSettings } from '../context/SettingsContext';

// TYPES
import { UploadedFile, ExternalFile, AttachedItem } from '../types/file-uploader';

// UTILS
import { isFileAllowed, readFileAsText } from '../feature/Chat/utils/fileUtils';

// ── Constants ──
import { ALLOWED_FILE_EXTENSIONS } from '../feature/Chat/constants/constants';

interface UseFileHandlingProps {
  accountId?: string;
  onAddAttachedItem: (item: AttachedItem) => void;
}

export const useFileHandling = ({ accountId, onAddAttachedItem }: UseFileHandlingProps) => {
  const { apiUrl } = useSettings();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [externalFiles, setExternalFiles] = useState<ExternalFile[]>([]);
  const [invalidExternalFiles, setInvalidExternalFiles] = useState<
    { name: string; path: string; reason: string }[]
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const externalFileInputRef = useRef<HTMLInputElement>(null);

  const uploadFileToServer = async (file: UploadedFile) => {
    logger.info(`[useFileHandling] uploadFileToServer starting for file: ${file.name}, size: ${file.size}, type: ${file.type}`);
    
    if (!apiUrl || !accountId) {
      logger.error(`[useFileHandling] Upload failed: apiUrl="${apiUrl}", accountId="${accountId}"`);
      return;
    }

    logger.info(`[useFileHandling] API URL: ${apiUrl}/v1/chat/accounts/${accountId}/uploads`);

    // Set status to uploading
    setUploadedFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, isUploading: true } : f)),
    );

    try {
      let blob: Blob;
      if (file.content.startsWith('data:')) {
        logger.info(`[useFileHandling] Converting base64 data to Blob`);
        const arr = file.content.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || file.type || 'application/octet-stream';
        logger.info(`[useFileHandling] MIME type: ${mime}`);
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
        logger.info(`[useFileHandling] Blob created, size: ${blob.size} bytes`);
      } else {
        logger.info(`[useFileHandling] Creating Blob from text content`);
        blob = new Blob([file.content], { type: file.type || 'text/plain' });
      }

      const formData = new FormData();
      formData.append('file', blob, file.name);
      logger.info(`[useFileHandling] FormData prepared, sending POST request...`);

      const uploadRes = await fetch(`${apiUrl}/v1/chat/accounts/${accountId}/uploads`, {
        method: 'POST',
        body: formData,
      });

      logger.info(`[useFileHandling] Upload response status: ${uploadRes.status} ${uploadRes.statusText}`);

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        logger.error(`[useFileHandling] Upload API error response: ${errorText}`);
        throw new Error(`Upload API returned status ${uploadRes.status}: ${errorText}`);
      }

      const uploadData = await uploadRes.json();
      logger.info(`[useFileHandling] Upload response data:`, uploadData);
      
      if (uploadData.success && uploadData.data?.file_id) {
        logger.info(`[useFileHandling] Upload successful! file_id: ${uploadData.data.file_id}`);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, file_id: uploadData.data.file_id, isUploading: false } : f,
          ),
        );
      } else {
        const errorMsg = uploadData.error || 'Unknown upload error';
        logger.error(`[useFileHandling] Upload failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      logger.error(`[useFileHandling] Upload exception:`, err);
      logger.error(`[useFileHandling] Error message: ${err.message}`);
      logger.error(`[useFileHandling] Error stack: ${err.stack}`);
      
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, isUploading: false, error: err.message || String(err) } : f,
        ),
      );
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    logger.info('[useFileHandling] handlePaste triggered');
    const items = e.clipboardData.items;
    logger.info(`[useFileHandling] Clipboard items count: ${items.length}`);
    let hasImage = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      logger.info(`[useFileHandling] Item ${i}: kind="${item.kind}", type="${item.type}"`);
      
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          hasImage = true;
          logger.info(`[useFileHandling] Processing image file: name="${file.name}", size=${file.size}, type="${file.type}"`);
          
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
            logger.info(`[useFileHandling] Image converted to base64, size: ${content.length} chars, uploading...`);
            setUploadedFiles((prev) => [...prev, newFile]);
            uploadFileToServer(newFile);
          };
          
          reader.onerror = (error) => {
            logger.error('[useFileHandling] FileReader error:', error);
          };
          
          reader.readAsDataURL(file);
        } else {
          logger.warn(`[useFileHandling] Item ${i} is image but getAsFile() returned null`);
        }
      }
    }

    if (hasImage) {
      logger.info('[useFileHandling] Image found, preventing default paste behavior');
      e.preventDefault();
    } else {
      logger.info('[useFileHandling] No image found in clipboard');
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
      const vscodeApi = (window as any).vscodeApi;
      const message = `Cannot add file(s):\n${invalidFiles.map((f) => `• ${f.name}: ${f.reason}`).join('\n')}`;
      if (vscodeApi) {
        vscodeApi.postMessage({
          command: 'showWarning',
          message: message,
        });
      } else {
        alert(message);
      }
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
      const vscodeApi = (window as any).vscodeApi;
      if (vscodeApi) {
        vscodeApi.postMessage({
          command: 'showWarning',
          message: `${newInvalidFiles.length} file(s) could not be added:\n${newInvalidFiles.map((f) => `• ${f.name}: ${f.reason}`).join('\n')}`,
        });
      } else {
        alert(
          `Cannot add file(s):\n${newInvalidFiles.map((f) => `• ${f.name}: ${f.reason}`).join('\n')}`,
        );
      }
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
        logger.warn('[useFileHandling] Failed to add attached item:', error);
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
