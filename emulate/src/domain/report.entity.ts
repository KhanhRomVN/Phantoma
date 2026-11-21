/**
 * Report — entity.
 * JSON snake_case keys are preserved to stay wire-compatible with the frontend.
 */

export interface Report {
  id: string;
  emulate_target_id: string;
  title: string;
  content: string;
  file_path: string;
  created_at: number;
  updated_at: number;
}
