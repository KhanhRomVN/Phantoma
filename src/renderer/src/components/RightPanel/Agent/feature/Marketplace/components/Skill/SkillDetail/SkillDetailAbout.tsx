import { MarkdownRenderer } from '@renderer/components/RightPanel/Agent/feature/Chat/components/ChatBody/AIMessageBox/renderers/other/MarkdownRenderer';
import { $ } from '@renderer/utils/color';

interface SkillDetailAboutProps {
  content?: string;
}

/** Section "About this skill" — render markdown với label và divider phía trên. */
export function SkillDetailAbout({ content }: SkillDetailAboutProps) {
  if (!content) return null;

  return (
    <div
      className="pt-3.5 border-t"
      style={{ borderColor: $('--border') }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-wide mb-2.5"
        style={{ color: $('--text-secondary') }}
      >
        About this skill
      </div>
      <MarkdownRenderer
        content={content}
        className="text-sm leading-relaxed"
      />
    </div>
  );
}