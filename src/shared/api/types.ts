/**
 * Shared API types — khớp với Go backend domain/target.go
 * 
 * Cập nhật khi schema thay đổi trong Go backend.
 */

export interface TargetDTO {
  id: string;
  title: string;
  url?: string | null;
  icon?: string | null;
  platform?: string | null;
  last_used_at?: number | null;
  executable_path?: string | null;
  startup_args?: string | null;
  environment?: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateTargetDTO {
  id?: string;
  title: string;
  url?: string | null;
  icon?: string | null;
  platform?: string | null;
  executable_path?: string | null;
  startup_args?: string | null;
  environment?: string | null;
}

export interface UpdateTargetDTO {
  title?: string;
  url?: string | null;
  icon?: string | null;
  platform?: string | null;
  last_used_at?: number | null;
  executable_path?: string | null;
  startup_args?: string | null;
  environment?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}