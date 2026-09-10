/**
 * ------------------------------------------------------------------
 * Report Store
 * ------------------------------------------------------------------
 * Zustand store quản lý danh sách report markdown trong module
 * Emulate. Dữ liệu được load từ backend API (SQLite).
 *
 * Mỗi report có:
 * - id       : UUID định danh
 * - title    : Lấy từ dòng tiêu đề đầu tiên của nội dung markdown
 * - content  : Toàn bộ nội dung markdown
 * - createdAt/updatedAt : Timestamp
 *
 * Actions chính:
 * - loadReports()    : Load danh sách từ backend
 * - createReport()   : Tạo report mới (in-memory, không cần file_path)
 * - updateReport()   : Cập nhật nội dung, re-parse title
 * - deleteReport()   : Xóa report
 * - generateUniqueTitle() : Tạo title ngẫu nhiên không trùng
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Store ──
import { create } from 'zustand';

// ── Services ──
import { emulateApi } from '../services/emulate-api.service';

// ─── Types ──────────────────────────────────────────────────────────────
export interface Report {
  id: string;
  title: string;
  content: string;
  filePath?: string;
  createdAt: number;
  updatedAt: number;
}

interface ReportStore {
  reports: Report[];
  selectedReportId: string | null;
  isLoading: boolean;

  // Actions
  loadReports: (targetId: string) => Promise<void>;
  createReport: (targetId: string, content: string, title?: string) => Promise<Report>;
  updateReport: (id: string, content: string) => void;
  deleteReport: (id: string) => void;
  setSelectedReportId: (id: string | null) => void;
  getReport: (id: string) => Report | undefined;
}

/** Parse title từ dòng đầu tiên của markdown (bỏ marker # và khoảng trắng). */
function parseTitle(content: string): string {
  const firstLine = content.split('\n')[0]?.trim() || '';
  const title = firstLine.replace(/^#{1,6}\s+/, '').trim();
  return title || 'Untitled Report';
}

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'report-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

// ─── Title Generator ────────────────────────────────────────────────────
const TITLE_ADJECTIVES = [
  'Security',
  'API',
  'Traffic',
  'Performance',
  'Vulnerability',
  'Flow',
  'Session',
  'Endpoint',
  'Authentication',
  'Data',
  'Network',
  'Reverse Engineering',
];

const TITLE_NOUNS = [
  'Audit',
  'Analysis',
  'Review',
  'Assessment',
  'Investigation',
  'Mapping',
  'Report',
  'Summary',
  'Inspection',
];

/** Tạo title ngẫu nhiên không trùng với các title hiện có. */
export function generateUniqueTitle(existingTitles: string[]): string {
  const existing = new Set(existingTitles);
  for (let attempt = 0; attempt < 50; attempt++) {
    const adj = TITLE_ADJECTIVES[Math.floor(Math.random() * TITLE_ADJECTIVES.length)];
    const noun = TITLE_NOUNS[Math.floor(Math.random() * TITLE_NOUNS.length)];
    const title = `${adj} ${noun}`;
    if (!existing.has(title)) return title;
  }
  return `Report ${Date.now()}`;
}

// ─── Store ──────────────────────────────────────────────────────────────
export const useReportStore = create<ReportStore>((set, get) => ({
  reports: [],
  selectedReportId: null,
  isLoading: false,

  loadReports: async (targetId) => {
    set({ isLoading: true });
    const res = await emulateApi.listReports(targetId);
    if (res.success && res.data) {
      const reports = res.data.map((dto) => ({
        id: dto.id,
        title: dto.title,
        content: dto.content,
        filePath: dto.file_path,
        createdAt: dto.created_at * 1000,
        updatedAt: dto.updated_at * 1000,
      }));
      set({ reports, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  createReport: async (targetId, content, title) => {
    const res = await emulateApi.createReport(targetId, {
      emulate_target_id: targetId,
      title: title || parseTitle(content),
      content,
    });

    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to create report');
    }

    const dto = res.data;
    const report: Report = {
      id: dto.id,
      title: dto.title,
      content: dto.content,
      filePath: dto.file_path,
      createdAt: dto.created_at * 1000,
      updatedAt: dto.updated_at * 1000,
    };

    set((state) => ({
      reports: [report, ...state.reports],
    }));

    return report;
  },

  updateReport: (id, content) =>
    set((state) => {
      const reports = state.reports.map((r) =>
        r.id === id ? { ...r, content, title: parseTitle(content), updatedAt: Date.now() } : r,
      );
      return { reports };
    }),

  deleteReport: (id) =>
    set((state) => {
      const reports = state.reports.filter((r) => r.id !== id);
      const selectedReportId =
        state.selectedReportId === id ? (reports[0]?.id ?? null) : state.selectedReportId;
      return { reports, selectedReportId };
    }),

  setSelectedReportId: (id) => set({ selectedReportId: id }),

  getReport: (id) => get().reports.find((r) => r.id === id),
}));