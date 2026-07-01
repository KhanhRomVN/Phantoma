/**
 * Lấy giá trị CSS variable và format thành màu hợp lệ
 * @param name - Tên CSS variable (ví dụ: '--primary')
 * @returns Màu đã được format (rgb, hex, hoặc giá trị gốc)
 * 
 * @example
 * // CSS: --primary: 54 134 255;
 * $('--primary') // returns 'rgb(54 134 255)'
 * 
 * // CSS: --primary-color: #3686ff;
 * $('--primary-color') // returns '#3686ff'
 */
export function $(name: string, alpha?: number): string {
  if (typeof window === 'undefined') {
    return name;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  if (!value) {
    return name;
  }

  // Nếu là giá trị RGB (3 số cách nhau bởi khoảng trắng)
  // Ví dụ: "54 134 255" hoặc "54 134 255 / 0.5"
  if (/^\d+\s+\d+\s+\d+/.test(value)) {
    // Xử lý cả trường hợp có alpha
    const match = value.match(/^(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?/);
    if (match) {
      const [, r, g, b, existingAlpha] = match;
      // Nếu có alpha parameter, dùng nó; nếu không, dùng existingAlpha hoặc 1
      const finalAlpha = alpha !== undefined ? alpha : (existingAlpha ? parseFloat(existingAlpha) : 1);
      if (finalAlpha < 1) {
        return `rgba(${r}, ${g}, ${b}, ${finalAlpha})`;
      }
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  // Nếu đã là màu hợp lệ (hex, rgb, rgba, hsl, etc.)
  return value;
}