/**
 * ------------------------------------------------------------------
 * file-upload.service
 * ------------------------------------------------------------------
 * Upload transport dùng chung cho Home và Chat: đổi content (data URL
 * hoặc text) thành Blob, POST multipart lên backend và trả về file_id.
 *
 * Main functions:
 * - uploadFileToBackend() : Upload 1 file, trả về file_id (throw khi lỗi)
 * ------------------------------------------------------------------
 */

export interface UploadableFile {
  name: string;
  type?: string;
  content: string;
}

export interface UploadFileParams {
  apiUrl: string;
  accountId: string;
  file: UploadableFile;
}

const dataUrlToBlob = (content: string, fallbackType?: string): Blob => {
  const arr = content.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || fallbackType || 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const contentToBlob = (file: UploadableFile): Blob =>
  file.content.startsWith('data:')
    ? dataUrlToBlob(file.content, file.type)
    : new Blob([file.content], { type: file.type || 'text/plain' });

export async function uploadFileToBackend({
  apiUrl,
  accountId,
  file,
}: UploadFileParams): Promise<string> {
  const formData = new FormData();
  formData.append('file', contentToBlob(file), file.name);

  const res = await fetch(`${apiUrl}/v1/uploads/accounts/${accountId}/uploads`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[file-upload] Upload API error response: ${errorText}`);
    throw new Error(`Upload API returned status ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  if (data.success && data.data?.file_id) return data.data.file_id as string;

  const errorMsg = data.error || 'Unknown upload error';
  console.error(`[file-upload] Upload failed: ${errorMsg}`);
  throw new Error(errorMsg);
}