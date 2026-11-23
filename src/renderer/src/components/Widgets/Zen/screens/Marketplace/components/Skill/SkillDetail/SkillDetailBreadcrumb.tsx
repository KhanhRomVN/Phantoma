import { ArrowLeft } from 'lucide-react';
import { $ } from '@renderer/utils/color';

interface SkillDetailBreadcrumbProps {
  name: string;
  onBack: () => void;
}

/** Breadcrumb bar — nút ArrowLeft + <tên skill>, cao bằng tabBar workspace (36px). */
export function SkillDetailBreadcrumb({ name, onBack }: SkillDetailBreadcrumbProps) {
  return (
    <div
      className="h-9 px-3 border-b flex-shrink-0 flex items-center gap-1.5 text-xs"
      style={{
        borderColor: $('--border'),
        color: $('--text-secondary'),
      }}
    >
      <button
        type="button"
        onClick={onBack}
        title="Back to skills"
        className="p-1 rounded-md bg-transparent border-none cursor-pointer flex items-center justify-center shrink-0 hover:bg-white/5"
        style={{ color: $('--text-secondary') }}
      >
        <ArrowLeft size={14} />
      </button>
      <span className="truncate" style={{ color: $('--text-primary') }}>
        {name}
      </span>
    </div>
  );
}