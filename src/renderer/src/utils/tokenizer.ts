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