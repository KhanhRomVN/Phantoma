/**
 * Shared API types between frontend and backend.
 * These types are used by both the renderer and main processes.
 */

// ── Base Response ────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── Target DTOs ──────────────────────────────────────────────────

export interface TargetDTO {
  id: string;
  title: string;
  url: string | null;
  icon: string | null;
  platform: string | null;
  executable_path: string | null;
  startup_args: string | null;
  environment: Record<string, string> | null;
  is_electron: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTargetDTO {
  id?: string;
  title: string;
  url?: string | null;
  icon?: string | null;
  platform?: string | null;
  executable_path?: string | null;
  startup_args?: string | null;
  environment?: Record<string, string> | null;
}

export interface UpdateTargetDTO {
  title?: string;
  url?: string | null;
  icon?: string | null;
  platform?: string | null;
  executable_path?: string | null;
  startup_args?: string | null;
  environment?: Record<string, string> | null;
}

// ── Scan DTOs (future) ──────────────────────────────────────────

export interface ScanRequestDTO {
  target: string;
  ports?: string;
  options?: Record<string, any>;
}

export interface ScanResultDTO {
  id: string;
  target: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  created_at: string;
  completed_at?: string;
}
