/**
 * Helper presentation cho skill: format số liệu, tạo excerpt và kiểm tra URL.
 * Không chứa network/IPC.
 */

const EXCERPT_MAX_CHARS = 280;

/** 1200 → "1.2k", 2_500_000 → "2.5M". */
export function formatCompactCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

/** Tạo đoạn preview từ content/description: bỏ frontmatter, gọn dòng trống, cắt 280 ký tự. */
export function createSkillExcerpt(skill: {
  content?: string;
  description?: string;
}): string {
  const usable = (v?: string) => (v && !/^\$(undefined|null)$/.test(v) ? v : "");
  const raw = usable(skill.content) || usable(skill.description);
  const body = raw
    .replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (body.length <= EXCERPT_MAX_CHARS) return body;
  return `${body.slice(0, EXCERPT_MAX_CHARS).trimEnd()}…`;
}

/** Chỉ cho phép mở external URL có scheme http/https. */
export function isSafeExternalUrl(url?: string): url is string {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** Mở URL ngoài nếu hợp lệ (http/https). */
export function openExternalUrl(url?: string): void {
  if (isSafeExternalUrl(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
