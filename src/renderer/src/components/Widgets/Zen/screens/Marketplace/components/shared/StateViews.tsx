/**
 * ------------------------------------------------------------------
 * StateViews — các UI trạng thái dùng chung trong Marketplace:
 * skeleton primitive + error / empty / no-results state.
 * Mapped to Phantoma Theme System.
 * ------------------------------------------------------------------
 */

import React from "react";
import { RefreshCw, PackageOpen, Search } from "lucide-react";
import { $ } from '@renderer/utils/color';

/** Khối skeleton cơ bản — 1 dải xám với hiệu ứng shimmer. */
export function SkeletonLine({
  width,
  height = 10,
  radius = 4,
  style,
}: {
  width: string | number;
  height?: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="skill-skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`,
        ...style,
      }}
    />
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}

/** Trạng thái lỗi kèm nút retry. */
export function ErrorState({
  message,
  onRetry,
  retryLabel = "Retry",
}: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-3 text-center p-8"
    >
      <p
        className="text-sm max-w-[320px]"
        style={{ color: $('--error') }}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-none cursor-pointer text-xs font-medium transition-opacity hover:opacity-90"
        style={{
          backgroundColor: $('--primary'),
          color: $('--text-foreground'), // Assuming white/dark contrast based on theme
        }}
      >
        <RefreshCw size={14} />
        {retryLabel}
      </button>
    </div>
  );
}

/** Trạng thái rỗng — không có skill nào. */
export function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-2 text-center"
      style={{ color: $('--text-secondary') }}
    >
      <PackageOpen size={32} style={{ opacity: 0.3 }} />
      <span className="text-sm">No skills found</span>
    </div>
  );
}

/** Trạng thái rỗng cho manager view — chưa cài skill nào. */
export function EmptyInstalledState() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-2 text-center p-8"
      style={{ color: $('--text-secondary') }}
    >
      <PackageOpen size={32} style={{ opacity: 0.3 }} />
      <span className="text-sm">No skills installed yet</span>
      <span className="text-xs opacity-60">
        Install a skill from Browse to see it here.
      </span>
    </div>
  );
}

/** Trạng thái không có kết quả khớp với query tìm kiếm. */
export function NoResultsState({ query }: { query: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-2 text-center"
      style={{ color: $('--text-secondary') }}
    >
      <Search size={32} style={{ opacity: 0.3 }} />
      <span className="text-sm">No results for "{query}"</span>
    </div>
  );
}