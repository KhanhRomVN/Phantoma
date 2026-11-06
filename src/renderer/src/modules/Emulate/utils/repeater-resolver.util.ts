/**
 * ------------------------------------------------------------------
 * Repeater Resolver Util
 * ------------------------------------------------------------------
 * Chuyển indexing mapping `repeater_<number>` thành request thực trong
 * database. Dùng chung cho delete/get_detail/update_content/run repeater.
 *
 * Các functions chính:
 * - resolveRepeater() : Validate id + targetId rồi lấy request từ DB
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import { emulateApi } from '../services/emulate-api.service';

// ─── Types ──────────────────────────────────────────────────────────────
type RepeaterRequest = NonNullable<
  Awaited<ReturnType<typeof emulateApi.listRequests>>['data']
>[number];

export type RepeaterResolution =
  | { req: RepeaterRequest; targetId: string; error?: undefined }
  | { req?: undefined; targetId?: undefined; error: string };

// ─── Functions ──────────────────────────────────────────────────────────
export async function resolveRepeater(
  tool: string,
  repeaterId: string,
  targetId?: string | null,
): Promise<RepeaterResolution> {
  const match = /^repeater_(\d+)$/i.exec(repeaterId.trim());
  if (!match) {
    return {
      error: `[${tool}] Error: invalid repeater id "${repeaterId}". Expected format: repeater_<number>`,
    };
  }
  if (!targetId) {
    return { error: `[${tool}] Error: targetId is required` };
  }

  const res = await emulateApi.listRequests(targetId);
  if (!res.success || !res.data) {
    return { error: `[${tool}] Error: ${res.error || 'Failed to fetch from database'}` };
  }

  const idx = parseInt(match[1], 10);
  if (idx < 0 || idx >= res.data.length) {
    return {
      error: `[${tool}] Error: repeater ${repeaterId} out of range (0-${res.data.length - 1})`,
    };
  }

  return { req: res.data[idx], targetId };
}