/** Một trang cần quét (mở tab → đọc DOM → đóng tab). */
export interface ScanTarget {
  id: string;
  site: 'browserscan' | 'browserleaks' | 'creepjs' | 'sannysoft' | 'glassbox';
  /** Tên site hiển thị trên UI (tab Raw Data). */
  siteLabel: string;
  /** Tên trang hiển thị trên UI. */
  label: string;
  url: string;
  /** Thời gian tối đa chờ dữ liệu xuất hiện trong DOM (ms). */
  timeoutMs: number;
}

/** Kết quả thô của 1 trang: key → giá trị lấy từ DOM. */
export type RawPage = Record<string, any>;

/** Kết quả thô của toàn bộ lần quét: pageId → dữ liệu. Trang lỗi sẽ không có mặt. */
export type RawPages = Record<string, RawPage>;

export type PageStatus = 'pending' | 'loading' | 'scraping' | 'ok' | 'error';

/** Một Group dữ liệu (network, navigator, ...): key → giá trị bất kỳ. */
export type GroupData = Record<string, any>;

/** Contract dữ liệu của UI: key top-level = group, kèm các key meta. */
export interface ScanData {
  titles?: Record<string, string>;
  warnings?: Record<string, string[]>;
  inverseScores?: string[];
  snapshot?: unknown;
  [group: string]: any;
}

export type ScanPhase = 'idle' | 'running' | 'done' | 'error';
export type ThemeMode = 'dark' | 'light';

/** Trạng thái lần quét — background ghi vào chrome.storage.session, newtab đọc. */
export interface ScanState {
  phase: ScanPhase;
  /** 0–100 */
  progress: number;
  pages: Record<string, { status: PageStatus; error?: string }>;
  data?: ScanData;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

export type ScanCommand = { type: 'scan:start' } | { type: 'scan:stop' } | { type: 'scan:dirty'; pageId: string };

export const SCAN_STATE_KEY = 'scanState';
