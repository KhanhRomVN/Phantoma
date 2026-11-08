
import { ChevronRight } from "lucide-react";
import { $ } from '@renderer/utils/color';

interface SkillDetailBreadcrumbProps {
  name: string;
  onBack: () => void;
}

/** Breadcrumb bar — "Browse > <tên skill>" với nút quay lại. */
export function SkillDetailBreadcrumb({
  name,
  onBack,
}: SkillDetailBreadcrumbProps) {
  return (
    <div
      className="px-5 py-3 border-b flex-shrink-0 flex items-center gap-1 text-xs"
      style={{
        borderColor: $('--border'),
        color: $('--text-secondary'),
      }}
    >
      <button
        type="button"
        onClick={onBack}
        className="bg-transparent border-none p-0 cursor-pointer text-xs"
        style={{ color: $('--primary') }}
      >
        Browse
      </button>
      <ChevronRight size={12} style={{ opacity: 0.6 }} />
      <span
        className="truncate"
        style={{ color: $('--text-primary') }}
      >
        {name}
      </span>
    </div>
  );
}