import { Download, ExternalLink, Eye, Plus, Trash2 } from "lucide-react";
import type { SkillDetail as SkillDetailData } from "../../../types/skill.types";
import { formatNumber } from "../../../utils/formatNumber";
import { $ } from '@renderer/utils/color';

interface SkillDetailHeroProps {
  skill: SkillDetailData;
  installed: boolean;
  onToggleInstall: (skill: SkillDetailData) => void;
}

/** Hero section — title, author + badges, 2 button action (install/homepage) ở dòng dưới cùng. */
export function SkillDetailHero({
  skill,
  installed,
  onToggleInstall,
}: SkillDetailHeroProps) {
  const handleOpenHomepage = () => {
    if (skill.sourceUrl) {
      window.open(skill.sourceUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="relative mb-4">
      <h3
        className="text-lg font-bold m-0 mb-1.5 leading-snug"
        style={{ color: $('--text-primary') }}
      >
        {skill.name}
      </h3>

      <div
        className="flex items-center gap-2.5 flex-wrap text-xs"
      >
        {skill.author && (
          <span className="opacity-80" style={{ color: $('--text-secondary') }}>
            by {skill.author}
          </span>
        )}
        {skill.installs !== undefined && (
          <span
            className="inline-flex items-center gap-1"
            style={{ color: $('--text-secondary') }}
          >
            <Download
              size={12}
              style={{ color: $('--success') }}
            />
            {formatNumber(skill.installs)} installs
          </span>
        )}
        {skill.views !== undefined && (
          <span
            className="inline-flex items-center gap-1"
            style={{ color: $('--text-secondary') }}
          >
            <Eye
              size={12}
              style={{ color: $('--primary') }}
            />
            {formatNumber(skill.views)} views
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        {skill.slug && (
          <button
            type="button"
            onClick={() => onToggleInstall(skill)}
            title={installed ? "Uninstall skill" : "Install skill"}
            className="h-[28px] px-2.5 gap-1.5 rounded-lg border-none cursor-pointer flex items-center justify-center text-xs font-medium transition-all duration-150"
            style={{
              backgroundColor: installed
                ? `color-mix(in srgb, ${$('--error')} 15%, transparent)`
                : `color-mix(in srgb, ${$('--primary')} 18%, transparent)`,
              color: installed
                ? $('--error')
                : $('--primary'),
            }}
          >
            {installed ? <Trash2 size={14} /> : <Plus size={14} />}
            {installed ? "Uninstall" : "Install"}
          </button>
        )}

        {skill.sourceUrl && (
          <button
            type="button"
            onClick={handleOpenHomepage}
            title="Open homepage"
            className="h-[28px] px-2.5 gap-1.5 rounded-lg border-none cursor-pointer flex items-center justify-center text-xs font-medium"
            style={{
              backgroundColor: $('--input-background'),
              color: $('--text-secondary'),
            }}
          >
            <ExternalLink size={14} />
            Homepage
          </button>
        )}
      </div>
    </div>
  );
}