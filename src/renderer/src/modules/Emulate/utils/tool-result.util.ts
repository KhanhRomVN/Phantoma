/**
 * ------------------------------------------------------------------
 * Tool Result Util
 * ------------------------------------------------------------------
 * Bọc việc chạy một emulate tool: trả text output (null nếu rỗng) và
 * chuyển exception thành chuỗi lỗi chuẩn `[tool] Result: Error - ...`.
 *
 * Các functions chính:
 * - runTool() : Chạy tool và chuẩn hoá kết quả/lỗi
 * ------------------------------------------------------------------
 */

// ─── Functions ──────────────────────────────────────────────────────────
export async function runTool(
  tool: string,
  run: () => string | Promise<string>,
): Promise<string | null> {
  try {
    return (await run()) || null;
  } catch (err: any) {
    return `[${tool}] Result: Error - ${err.message || String(err)}`;
  }
}