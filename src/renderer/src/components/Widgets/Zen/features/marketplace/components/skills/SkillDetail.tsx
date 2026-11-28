/**
 * SkillDetail — màn hình chi tiết skill.
 * Gồm breadcrumb, hero, description, about (section nội bộ, chỉ dùng ở đây).
 */

import { ArrowLeft, Download, ExternalLink, Eye, Plus, Trash2 } from 'lucide-react';
import type { SkillDetail as SkillDetailData } from '../../types/skill.types';
import { formatCompactCount, isSafeExternalUrl, openExternalUrl } from '../../skill-presentation';
import { SkeletonLine } from './SkillStates';
import { $ } from '@renderer/utils/color';
import { MarkdownRenderer } from '../../../chat/components/chatbody/aimessagebox/renderers/MarkdownRenderer';

interface SkillDetailProps {
  skill: SkillDetailData;
  installed: boolean;
  onBack: () => void;
  onToggleInstall: (skill: SkillDetailData) => void;
}

export function SkillDetail({ skill, installed, onBack, onToggleInstall }: SkillDetailProps) {
  return (
    <div className="h-full flex flex-col">
      <SkillDetailBreadcrumb name={skill.name} onBack={onBack} />
      <div className="flex-1 min-w-0 overflow-y-auto p-[clamp(12px,4vw,20px)]">
        <SkillDetailHero skill={skill} installed={installed} onToggleInstall={onToggleInstall} />
        <SkillDetailDescription description={skill.description} />
        <SkillDetailAbout content={skill.content} />
      </div>
    </div>
  );
}

interface SkillDetailBreadcrumbProps {
  name: string;
  onBack: () => void;
}

/** Breadcrumb bar — nút ArrowLeft + <tên skill>, cao bằng tabBar workspace (36px). */
function SkillDetailBreadcrumb({ name, onBack }: SkillDetailBreadcrumbProps) {
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

interface SkillDetailHeroProps {
  skill: SkillDetailData;
  installed: boolean;
  onToggleInstall: (skill: SkillDetailData) => void;
}

/** Hero section — title, author + badges, 2 button action (install/homepage) ở dòng dưới cùng. */
function SkillDetailHero({ skill, installed, onToggleInstall }: SkillDetailHeroProps) {
  const handleOpenHomepage = () => openExternalUrl(skill.sourceUrl);

  return (
    <div className="relative mb-4">
      <h3
        className="text-lg font-bold m-0 mb-1.5 leading-snug"
        style={{ color: $('--text-primary') }}
      >
        {skill.name}
      </h3>

      <div className="flex items-center gap-2.5 flex-wrap text-xs">
        {skill.author && (
          <span className="opacity-80" style={{ color: $('--text-secondary') }}>
            by {skill.author}
          </span>
        )}
        {skill.installs !== undefined && (
          <span className="inline-flex items-center gap-1" style={{ color: $('--text-secondary') }}>
            <Download size={12} style={{ color: $('--success') }} />
            {formatCompactCount(skill.installs)} installs
          </span>
        )}
        {skill.views !== undefined && (
          <span className="inline-flex items-center gap-1" style={{ color: $('--text-secondary') }}>
            <Eye size={12} style={{ color: $('--primary') }} />
            {formatCompactCount(skill.views)} views
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        {skill.slug && (
          <button
            type="button"
            onClick={() => onToggleInstall(skill)}
            title={installed ? 'Uninstall skill' : 'Install skill'}
            className="h-[28px] px-2.5 gap-1.5 rounded-lg border-none cursor-pointer flex items-center justify-center text-xs font-medium transition-all duration-150"
            style={{
              backgroundColor: installed
                ? `color-mix(in srgb, ${$('--error')} 15%, transparent)`
                : `color-mix(in srgb, ${$('--primary')} 18%, transparent)`,
              color: installed ? $('--error') : $('--primary'),
            }}
          >
            {installed ? <Trash2 size={14} /> : <Plus size={14} />}
            {installed ? 'Uninstall' : 'Install'}
          </button>
        )}

        {isSafeExternalUrl(skill.sourceUrl) && (
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

interface SkillDetailDescriptionProps {
  description?: string;
}

/** Section mô tả ngắn — paragraph với fontSize lớn hơn phần markdown. */
function SkillDetailDescription({ description }: SkillDetailDescriptionProps) {
  if (!description) return null;

  return (
    <p className="text-base m-0 mb-4.5 leading-relaxed" style={{ color: $('--text-primary') }}>
      {description}
    </p>
  );
}

interface SkillDetailAboutProps {
  content?: string;
}

/** Section "About this skill" — render markdown với label và divider phía trên. */
function SkillDetailAbout({ content }: SkillDetailAboutProps) {
  if (!content) return null;

  return (
    <div className="pt-3.5 border-t" style={{ borderColor: $('--border') }}>
      <div
        className="text-sm font-semibold uppercase tracking-wide"
        style={{ color: $('--text-secondary') }}
      >
        About this skill
      </div>
      <MarkdownRenderer content={content} className="text-sm leading-relaxed" />
    </div>
  );
}

/** Skeleton cho SkillDetail. */
export function SkillDetailSkeleton() {
  return (
    <div className="p-5">
      <SkeletonLine width="40%" height={10} style={{ marginBottom: '16px' }} />
      <SkeletonLine width="60%" height={20} style={{ marginBottom: '10px' }} />
      <SkeletonLine width="30%" height={11} style={{ marginBottom: '16px' }} />
      <div className="flex gap-2.5 mb-5">
        <SkeletonLine width={70} height={18} radius={6} />
        <SkeletonLine width={70} height={18} radius={6} />
      </div>
      <SkeletonLine width="25%" height={11} style={{ marginBottom: '8px' }} />
      <SkeletonLine width="100%" height={9} style={{ marginBottom: '5px' }} />
      <SkeletonLine width="95%" height={9} style={{ marginBottom: '5px' }} />
      <SkeletonLine width="85%" height={9} style={{ marginBottom: '20px' }} />
      <SkeletonLine width="30%" height={11} style={{ marginBottom: '8px' }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonLine key={i} width={`${90 - i * 5}%`} height={9} style={{ marginBottom: '6px' }} />
      ))}
      <style>{`
        @keyframes skillShimmer {
          0% { opacity: 0.55; }
          50% { opacity: 1; }
          100% { opacity: 0.55; }
        }
        .skill-skeleton-shimmer {
          animation: skillShimmer 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
