/**
 * ------------------------------------------------------------------
 * Common Types
 * ------------------------------------------------------------------
 * Các type dùng chung trong module Emulate — result, loading state,
 * pagination, search, sort, toast, modal, tab, context menu...

 * Các types chính:
 * - OperationResult<T> : Kết quả trả về của một operation
 * - LoadingState       : Trạng thái loading kèm error
 * - Pagination         : Thông tin phân trang
 * - SearchState        : Trạng thái tìm kiếm
 * - SortConfig         : Cấu hình sắp xếp
 * - ToastMessage       : Thông báo toast
 * - ModalConfig        : Cấu hình modal
 * - TabConfig          : Cấu hình tab
 * - ContextMenuItem    : Item trong context menu
 * - DropdownOption<T>  : Option cho dropdown
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import { ToolType } from '../constants/tools';
import { HttpMethod } from '../constants/methods';

// Re-export from constants for convenience
export type { ToolType, HttpMethod };

// ─── Types ──────────────────────────────────────────────────────────────
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface SearchState {
  term: string;
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegex: boolean;
}

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface AccentColor {
  color: string;
  index: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface ModalConfig {
  isOpen: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
}

export interface TabConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  separator?: boolean;
  className?: string;
}

export interface DropdownOption<T = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}