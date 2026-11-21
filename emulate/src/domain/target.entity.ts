/**
 * Target — entity.
 * JSON snake_case keys are preserved to stay wire-compatible with the frontend.
 */

export interface Target {
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
