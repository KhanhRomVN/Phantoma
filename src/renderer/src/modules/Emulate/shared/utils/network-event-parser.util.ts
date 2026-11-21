/**
 * Việc parse/chuẩn hóa event CDP & Proxy đã chuyển sang emulate/src
 * (utils/network-event.util.ts + services/realtime/network-normalizer.service.ts).
 * Renderer chỉ còn helper hiển thị bên dưới.
 */

/** Parse raw size (string như "1.5 KB" hoặc number bytes) → bytes + chuỗi hiển thị. */
export function formatResponseSize(rawSize: string | number | undefined): {
  sizeBytes: number;
  sizeStr: string;
} {
  let sizeBytes = 0;

  if (typeof rawSize === 'string') {
    const match = rawSize.match(/([\d.]+)\s*(KB|B)/i);
    if (match) {
      const num = parseFloat(match[1]);
      sizeBytes = match[2].toUpperCase() === 'KB' ? num * 1024 : num;
    }
  } else if (typeof rawSize === 'number') {
    sizeBytes = rawSize;
  }

  const sizeStr = sizeBytes > 0 ? `${(sizeBytes / 1024).toFixed(1)} KB` : '0 B';
  return { sizeBytes, sizeStr };
}