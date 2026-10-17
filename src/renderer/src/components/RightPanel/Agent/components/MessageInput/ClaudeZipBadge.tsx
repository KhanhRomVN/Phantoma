import React from 'react';
import { Loader2 } from 'lucide-react';
import type { ZipSizeState } from './hooks/useWorkspaceZipSize';

/**
 * Ngưỡng size (bytes) cho badge Claude workspace zip.
 * Gradient 6 mức: xanh lá → xanh mint → vàng nhạt → cam nhạt → cam đậm → đỏ.
 */
const SIZE_THRESHOLDS = [
  { maxBytes: 1 * 1024 * 1024, fg: "#22c55e", bgAlpha: 0.12, label: "Rất nhẹ" },        // <1MB
  { maxBytes: 5 * 1024 * 1024, fg: "#10b981", bgAlpha: 0.12, label: "Nhẹ" },             // <5MB
  { maxBytes: 15 * 1024 * 1024, fg: "#eab308", bgAlpha: 0.14, label: "Vừa" },            // <15MB
  { maxBytes: 30 * 1024 * 1024, fg: "#f97316", bgAlpha: 0.16, label: "Nặng" },           // <30MB
  { maxBytes: 60 * 1024 * 1024, fg: "#ea580c", bgAlpha: 0.18, label: "Rất nặng" },       // <60MB
  { maxBytes: Infinity, fg: "#ef4444", bgAlpha: 0.20, label: "Cực nặng" },               // >=60MB
];

const pickTier = (bytes: number) =>
  SIZE_THRESHOLDS.find((t) => bytes < t.maxBytes) ?? SIZE_THRESHOLDS[SIZE_THRESHOLDS.length - 1];

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

interface Props {
  state: ZipSizeState;
}

/**
 * Badge hiển thị kích thước file zip workspace khi provider = claude.
 * Đặt cạnh token counter trong toolbar phải của MessageInput.
 */
export const ClaudeZipBadge: React.FC<Props> = ({ state }) => {
  const { sizeBytes, fileCount, isZipping, error } = state;

  // Chưa có dữ liệu & đang zip → spinner nhỏ
  if (isZipping && sizeBytes === null) {
    return (
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap text-text-secondary bg-gray-500/10"
        title="Đang tính dung lượng workspace..."
      >
        <Loader2 size={11} className="animate-spin" strokeWidth={2.5} />
        <span>zip…</span>
      </div>
    );
  }

  // Lỗi → badge xám mờ, tooltip giải thích
  if (error) {
    return (
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap opacity-70 text-text-secondary bg-gray-500/10"
        title={`Không lấy được size workspace: ${error}`}
      >
        <span>n/a</span>
      </div>
    );
  }

  if (sizeBytes === null) return null;

  const tier = pickTier(sizeBytes);
  const sizeLabel = formatBytes(sizeBytes);
  const filesLabel = fileCount != null ? ` · ${fileCount} files` : "";

  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap"
      style={{
        color: tier.fg,
        backgroundColor: `color-mix(in srgb, ${tier.fg} ${Math.round(tier.bgAlpha * 100)}%, transparent)`,
      }}
      title={`Workspace zip: ${sizeLabel}${filesLabel} — ${tier.label}. Sẽ được upload kèm message đầu tiên khi dùng Claude.`}
    >
      <span>{sizeLabel}</span>
    </div>
  );
};