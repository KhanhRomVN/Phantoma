// Common types shared across Emulate feature
import { AppPlatform } from '../constants/platforms';
import { ToolType } from '../constants/tools';
import { HttpMethod } from '../constants/methods';

// Re-export from constants for convenience
export type { AppPlatform, ToolType, HttpMethod };

// Generic result type for operations
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// Generic loading state
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Generic pagination
export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

// Generic search
export interface SearchState {
  term: string;
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegex: boolean;
}

// Key-value pair for generic tables
export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

// Sort configuration
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// Theme accent color
export interface AccentColor {
  color: string;
  index: number;
}

// Toast notification
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Modal configuration
export interface ModalConfig {
  isOpen: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
}

// Tab configuration
export interface TabConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

// Context menu item
export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  separator?: boolean;
  className?: string;
}

// Dropdown option
export interface DropdownOption<T = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}