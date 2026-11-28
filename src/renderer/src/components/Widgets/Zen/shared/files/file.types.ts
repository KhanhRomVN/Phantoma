/**
 * ------------------------------------------------------------------
 * File Uploader Types
 * ------------------------------------------------------------------
 * Type definitions cho file upload và attach trong Agent Chat.
 *
 * Main types:
 * - AttachedItem : Item được attach vào chat input
 * - UploadedFile : File user upload lên backend
 * - ExternalFile : File từ đường dẫn bên ngoài workspace
 * ------------------------------------------------------------------
 */

/** An item attached to the chat input (file, folder, or external). */
export interface AttachedItem {
  id: string;
  path: string;
  type: "file" | "folder" | "external";
}

/** A file uploaded by the user (local or already uploaded to backend). */
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  /** Base64 or plain text content. */
  content: string;
  file_id?: string;
  isUploading?: boolean;
  error?: string;
}

/** A file loaded from an external path (outside the workspace). */
export interface ExternalFile {
  id: string;
  name: string;
  /** Full absolute path. */
  path: string;
  content: string;
  size: number;
}
