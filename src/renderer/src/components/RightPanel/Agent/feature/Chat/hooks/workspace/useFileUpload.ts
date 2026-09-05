import { useCallback } from 'react';
import { logger } from '@renderer/utils/logger';

/**
 * ------------------------------------------------------------------
 * useFileUpload
 * ------------------------------------------------------------------
 * Hook cung cấp hàm tải file cục bộ lên backend
 * và trả về file_ids để dùng trong các yêu cầu chat.
 *
 * Main returns:
 * - uploadFiles : Upload files lên backend, trả về danh sách file_ids
 * ------------------------------------------------------------------
 */

// ─── Hook ───────────────────────────────────────────────────────────────
export const useFileUpload = (apiUrl: string) => {
  /**
   * Uploads an array of file objects to the backend.
   * Files that already have a `file_id` are passed through as-is.
   * Returns a list of file_ids to include in the API request.
   */
  const uploadFiles = useCallback(
    async (files: any[], accountId: string): Promise<string[]> => {
      logger.info(`[useFileUpload] uploadFiles called with ${files.length} files, accountId: ${accountId}`);
      const ref_file_ids: string[] = [];

      const localFiles = files.filter(
        (f: any) =>
          !f.id?.startsWith('attached-') &&
          !f.id?.startsWith('rule-') &&
          !f.id?.startsWith('terminal-') &&
          !f.id?.startsWith('snippet-') && // 🚀 FIX: Don't upload text snippets
          !f.id?.startsWith('external-'), // 🚀 FIX: Don't upload external files (content already in them)
      );

      logger.info(`[useFileUpload] Filtered to ${localFiles.length} local files to upload`);

      for (const file of localFiles) {
        // Already uploaded — reuse existing file_id
        if (file.file_id) {
          logger.info(`[useFileUpload] File "${file.name}" already uploaded, reusing file_id: ${file.file_id}`);
          ref_file_ids.push(file.file_id);
          continue;
        }

        logger.info(`[useFileUpload] Uploading file: name="${file.name}", size=${file.size}, type="${file.type}"`);

        try {
          let blob: Blob;
          if (file.content.startsWith('data:')) {
            logger.info(`[useFileUpload] Converting base64 data to Blob`);
            const arr = file.content.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || file.type || 'application/octet-stream';
            logger.info(`[useFileUpload] MIME type: ${mime}`);
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            blob = new Blob([u8arr], { type: mime });
            logger.info(`[useFileUpload] Blob created, size: ${blob.size} bytes`);
          } else {
            logger.info(`[useFileUpload] Creating Blob from text content`);
            blob = new Blob([file.content], {
              type: file.type || 'text/plain',
            });
          }

          const formData = new FormData();
          formData.append('file', blob, file.name);
          
          const uploadUrl = `${apiUrl}/v1/chat/accounts/${accountId}/uploads`;
          logger.info(`[useFileUpload] Sending POST to: ${uploadUrl}`);

          const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
          });

          logger.info(`[useFileUpload] Upload response: status=${uploadRes.status} ${uploadRes.statusText}`);

          if (!uploadRes.ok) {
            const errorText = await uploadRes.text();
            logger.error(`[useFileUpload] Upload failed with status ${uploadRes.status}: ${errorText}`);
            throw new Error(`Upload API returned status ${uploadRes.status}: ${errorText}`);
          }

          const uploadData = await uploadRes.json();
          logger.info(`[useFileUpload] Upload response data:`, uploadData);
          
          if (uploadData.success && uploadData.data?.file_id) {
            logger.info(`[useFileUpload] Upload successful! file_id: ${uploadData.data.file_id}`);
            ref_file_ids.push(uploadData.data.file_id);
          } else {
            const errorMsg = uploadData.error || 'Unknown upload error';
            logger.error(`[useFileUpload] Upload failed: ${errorMsg}`);
            throw new Error(errorMsg);
          }
        } catch (err) {
          const errorMsg = `Failed to upload ${file.name}: ${err instanceof Error ? err.message : String(err)}`;
          logger.error(`[useFileUpload] Exception:`, err);
          logger.error(`[useFileUpload] Error message: ${errorMsg}`);
          throw new Error(errorMsg);
        }
      }

      logger.info(`[useFileUpload] All uploads completed. Total file_ids: ${ref_file_ids.length}`);
      return ref_file_ids;
    },
    [apiUrl],
  );

  return { uploadFiles };
};
