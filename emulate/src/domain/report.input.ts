/**
 * Report — create/update inputs.
 * JSON snake_case keys are preserved to stay wire-compatible with the frontend.
 */

export interface CreateReportInput {
  emulate_target_id: string;
  title: string;
  content: string;
  file_path: string;
}

export interface UpdateReportInput {
  title: string;
  content: string;
  file_path: string;
}
