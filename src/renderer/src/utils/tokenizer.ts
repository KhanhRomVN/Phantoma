/**
 * Đếm số token ước tính từ text.
 * Công thức đơn giản: 1 token ≈ 4 ký tự (theo OpenAI approximation).
 */
export const countTokens = (text: string): number => {
  if (!text) return 0;
  const clean = text.trim();
  if (!clean) return 0;
  return Math.ceil(clean.length / 4);
};

/**
 * Format token count ngắn gọn: 1234 → "1.2K", 1500000 → "1.5M".
 */
export const formatTokenCount = (count: number): string => {
  if (!Number.isFinite(count) || count < 0) return '0';
  if (count < 1000) return String(count);
  if (count < 1_000_000) {
    const k = count / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  const m = count / 1_000_000;
  return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
};