/**
 * TargetFilter — entity.
 * JSON snake_case keys are preserved to stay wire-compatible with the frontend.
 */

export interface TargetFilter {
  id: string;
  target_id: string;
  method: string;
  host: string;
  status: string;
  type: string;
}
