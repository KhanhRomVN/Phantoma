/**
 * Lấy favicon URL từ website URL.
 * Sử dụng Google favicon service để lấy icon đẹp.
 */
export const getFaviconUrl = (website: string): string => {
  try {
    const url = new URL(website);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
  } catch {
    return '';
  }
};