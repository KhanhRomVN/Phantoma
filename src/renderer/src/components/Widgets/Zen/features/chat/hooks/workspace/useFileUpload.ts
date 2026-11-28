import { useCallback } from 'react';
import { uploadFileToBackend } from '../../../../shared/files/file-upload.service';

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
      const ref_file_ids: string[] = [];

      const localFiles = files.filter(
        (f: any) =>
          !f.id?.startsWith('attached-') &&
          !f.id?.startsWith('rule-') &&
          !f.id?.startsWith('terminal-') &&
          !f.id?.startsWith('snippet-') &&
          !f.id?.startsWith('external-'),
      );

      for (const file of localFiles) {
        // Already uploaded — reuse existing file_id
        if (file.file_id) {
          ref_file_ids.push(file.file_id);
          continue;
        }

        try {
          ref_file_ids.push(await uploadFileToBackend({ apiUrl, accountId, file }));
        } catch (err) {
          const errorMsg = `Failed to upload ${file.name}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(`[useFileUpload] Exception:`, err);
          console.error(`[useFileUpload] Error message: ${errorMsg}`);
          throw new Error(errorMsg);
        }
      }

      return ref_file_ids;
    },
    [apiUrl],
  );

  return { uploadFiles };
};
