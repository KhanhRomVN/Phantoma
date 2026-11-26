/**
 * ------------------------------------------------------------------
 * Fuzzer Resolver Util
 * ------------------------------------------------------------------
 * Chuyển indexing mapping `fuzzer_<number>` thành request thực trong
 * database. Dùng chung cho delete/get_detail/update_content/run fuzzer.
 *
 * Các functions chính:
 * - resolveFuzzer() : Validate id + targetId rồi lấy request từ DB
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import { emulateApi } from '../services/emulate-api.service';

// ─── Types ──────────────────────────────────────────────────────────────
type FuzzerRequest = NonNullable<
  Awaited<ReturnType<typeof emulateApi.listRequests>>['data']
>[number];

export type FuzzerResolution =
  | { req: FuzzerRequest; targetId: string; error?: undefined }
  | { req?: undefined; targetId?: undefined; error: string };

// ─── Functions ──────────────────────────────────────────────────────────
export async function resolveFuzzer(
  tool: string,
  fuzzerId: string,
  targetId?: string | null,
): Promise<FuzzerResolution> {
  const match = /^fuzzer_(\d+)$/i.exec(fuzzerId.trim());
  if (!match) {
    return {
      error: `[${tool}] Error: invalid fuzzer id "${fuzzerId}". Expected format: fuzzer_<number>`,
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
      error: `[${tool}] Error: fuzzer ${fuzzerId} out of range (0-${res.data.length - 1})`,
    };
  }

  return { req: res.data[idx], targetId };
}