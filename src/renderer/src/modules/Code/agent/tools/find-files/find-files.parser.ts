/**
 * ------------------------------------------------------------------
 * Find Files Parser
 * ------------------------------------------------------------------
 * Parse nội dung tag find_files, thu thập các thẻ file_name thành params.
 *
 * Main types:
 * - FindFilesParams : Params của tool (danh sách file_names)
 *
 * Main functions:
 * - parseFindFiles() : Trích xuất các file_name từ nội dung
 * ------------------------------------------------------------------
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export interface FindFilesParams {
  file_names: string[];
}

// ─── Functions ───────────────────────────────────────────────────────────────
export function parseFindFiles(content: string): FindFilesParams {
  const fileNames: string[] = [];

  // Match all <file_name>...</file_name> tags
  const fileNameRegex = /<file_name>(.*?)<\/file_name>/gs;
  let match;

  while ((match = fileNameRegex.exec(content)) !== null) {
    const fileName = match[1].trim();
    if (fileName) {
      fileNames.push(fileName);
    }
  }

  return {
    file_names: fileNames,
  };
}