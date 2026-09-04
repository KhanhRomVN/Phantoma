export function $(name: string, alpha?: number): string {
  if (typeof window === 'undefined') {
    return name;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  if (!value) {
    return name;
  }

  if (/^\d+\s+\d+\s+\d+/.test(value)) {
    // Xử lý cả trường hợp có alpha
    const match = value.match(/^(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?/);
    if (match) {
      const [, r, g, b, existingAlpha] = match;
      // Nếu có alpha parameter, dùng nó; nếu không, dùng existingAlpha hoặc 1
      const finalAlpha =
        alpha !== undefined ? alpha : existingAlpha ? parseFloat(existingAlpha) : 1;
      if (finalAlpha < 1) {
        return `rgba(${r}, ${g}, ${b}, ${finalAlpha})`;
      }
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  // Nếu đã là màu hợp lệ (hex, rgb, rgba, hsl, etc.)
  return value;
}
