/**
 * ------------------------------------------------------------------
 * Report File Service
 * ------------------------------------------------------------------
 * Quản lý file code (.html, .css, .js) bên trong mỗi report.
 * Dùng filesystem qua IPC (window.api.invoke) với cấu trúc:
 *
 *   ~/.phantoma/emulate:{targetId}/reports/report:{reportId}/code/
 *     ├── index.html
 *     ├── style.css
 *     └── script.js
 *
 * Chỉ chấp nhận file phẳng (không thư mục con), đuôi .html/.css/.js.
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
export interface ReportFileEntry {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
}

const ALLOWED_EXTENSIONS = ['.html', '.css', '.js'];

/** Kiểm tra tên file hợp lệ: phẳng, đúng đuôi, không chứa ký tự nguy hiểm. */
function validateFileName(fileName: string): boolean {
  if (!fileName || fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
    return false;
  }
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function getApi(): any {
  const api = (window as any).api;
  if (!api?.invoke) {
    throw new Error('IPC not available');
  }
  return api;
}

async function getHomedir(): Promise<string> {
  return await getApi().invoke('fs:get-homedir');
}

/** Trả về đường dẫn tuyệt đối tới thư mục code của report. */
export async function getReportCodeDir(targetId: string, reportId: string): Promise<string> {
  const home = await getHomedir();
  return `${home}/.phantoma/emulate:${targetId}/reports/report:${reportId}/code`;
}

export const reportFileService = {
  /** Liệt kê toàn bộ file code trong report (chỉ file, bỏ folder). */
  async listFiles(targetId: string, reportId: string): Promise<ReportFileEntry[]> {
    const dir = await getReportCodeDir(targetId, reportId);
    try {
      const entries = await getApi().invoke('fs:read-dir', dir);
      if (!Array.isArray(entries)) return [];
      return entries.filter(
        (e: any) => e.type === 'file' && validateFileName(e.name),
      );
    } catch {
      return []; // Thư mục chưa tồn tại
    }
  },

  /** Đọc nội dung file code. */
  async readFile(targetId: string, reportId: string, fileName: string): Promise<string> {
    if (!validateFileName(fileName)) {
      throw new Error('Invalid file name: ' + fileName);
    }
    const dir = await getReportCodeDir(targetId, reportId);
    return await getApi().invoke('fs:read-file', `${dir}/${fileName}`);
  },

  /** Ghi nội dung file code (tạo mới hoặc ghi đè). */
  async writeFile(
    targetId: string,
    reportId: string,
    fileName: string,
    content: string,
  ): Promise<boolean> {
    if (!validateFileName(fileName)) {
      throw new Error('Invalid file name: ' + fileName);
    }
    const dir = await getReportCodeDir(targetId, reportId);
    await getApi().invoke('fs:write-file', `${dir}/${fileName}`, content);
    return true;
  },

  /** Xóa file code. */
  async deleteFile(targetId: string, reportId: string, fileName: string): Promise<boolean> {
    if (!validateFileName(fileName)) {
      throw new Error('Invalid file name: ' + fileName);
    }
    const dir = await getReportCodeDir(targetId, reportId);
    await getApi().invoke('fs:delete-file', `${dir}/${fileName}`);
    return true;
  },

  /** Mở folder chứa code của report bằng file manager của OS. */
  async openFolder(targetId: string, reportId: string): Promise<boolean> {
    const dir = await getReportCodeDir(targetId, reportId);
    await getApi().invoke('shell:open-path', dir);
    return true;
  },
};