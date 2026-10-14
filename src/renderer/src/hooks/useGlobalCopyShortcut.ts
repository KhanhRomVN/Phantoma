import { useEffect } from 'react';

/**
 * Hook để xử lý phím tắt Copy (Ctrl+C / Cmd+C) toàn cục cho text đã chọn.
 * Electron không tự động bind phím này cho selection text như browser thông thường,
 * nên chúng ta cần can thiệp thủ công.
 */
export const useGlobalCopyShortcut = () => {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Chỉ xử lý khi nhấn Ctrl+C hoặc Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        // Lấy text đang được chọn bởi user
        const selection = window.getSelection();
        const selectedText = selection?.toString();

        // Nếu có text được chọn, thực hiện copy
        if (selectedText && selectedText.trim().length > 0) {
          try {
            await navigator.clipboard.writeText(selectedText);
          } catch (err) {
            console.error('[GlobalCopy] Failed to copy to clipboard:', err);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
