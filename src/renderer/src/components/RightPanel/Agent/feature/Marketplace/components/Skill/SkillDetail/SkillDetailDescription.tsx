
import { $ } from '@renderer/utils/color';

interface SkillDetailDescriptionProps {
  description?: string;
}

/** Section mô tả ngắn — paragraph với fontSize lớn hơn phần markdown. */
export function SkillDetailDescription({
  description,
}: SkillDetailDescriptionProps) {
  if (!description) return null;

  return (
    <p
      className="text-base m-0 mb-4.5 leading-relaxed"
      style={{ color: $('--text-primary') }}
    >
      {description}
    </p>
  );
}