/**
 * ------------------------------------------------------------------
 * HTML Entities Decoder
 * ------------------------------------------------------------------
 * Giải mã các thực thể HTML phổ biến trở lại ký tự gốc.
 *
 * Main functions:
 * - decodeHtmlEntities() : Giải mã HTML entities trong text
 * ------------------------------------------------------------------
 */

// ─── Functions ──────────────────────────────────────────────────────────
const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "'");
};

// Re-export so ToolParser can import from one place without duplicating.
export { decodeHtmlEntities };