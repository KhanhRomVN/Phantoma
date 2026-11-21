/**
 * TargetFilter — create/update inputs.
 * JSON snake_case keys are preserved to stay wire-compatible with the frontend.
 */

export interface CreateTargetFilterInput {
  target_id: string;
  method: string;
  host: string;
  status: string;
  type: string;
}

export interface UpdateTargetFilterInput {
  method?: string | null;
  host?: string | null;
  status?: string | null;
  type?: string | null;
}
