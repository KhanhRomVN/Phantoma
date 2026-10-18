
import type { SkillSummary } from "../../../types/skill.types";
import {
  SkeletonLine,
  ErrorState,
  EmptyState,
  NoResultsState,
} from "../../shared/StateViews";
import { SkillCard } from "./SkillCard";

interface SkillListProps {
  skills: SkillSummary[];
  loading: boolean;
  searchLoading: boolean;
  error: string | null;
  searchQuery: string;
  installedSlugs: Set<string>;
  onRetry: () => void;
  onSkillClick: (skill: SkillSummary) => void;
  onInstallClick: (skill: SkillSummary) => void;
  onUninstall: (skill: SkillSummary) => void;
}

/**
 * Vùng danh sách skill — quyết định hiển thị state nào dựa trên props:
 * loading > error > empty > no-results > grid.
 */
export function SkillList({
  skills,
  loading,
  searchLoading,
  error,
  searchQuery,
  installedSlugs,
  onRetry,
  onSkillClick,
  onInstallClick,
  onUninstall,
}: SkillListProps) {
  const visibleSkills = skills.filter((s) => !installedSlugs.has(s.slug));

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <SkillListSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {error && <ErrorState message={error} onRetry={onRetry} />}

      {!error && visibleSkills.length === 0 && !searchQuery.trim() && (
        <EmptyState />
      )}

      {!error &&
        visibleSkills.length === 0 &&
        searchQuery.trim() &&
        !searchLoading && <NoResultsState query={searchQuery} />}

      {!error && visibleSkills.length > 0 && (
        <div
          className="grid gap-3.5 px-4 pb-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {visibleSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              installed={installedSlugs.has(skill.slug)}
              onClick={onSkillClick}
              onInstallClick={onInstallClick}
              onUninstall={onUninstall}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Skeleton cho 1 SkillCard. */
function SkillCardSkeleton() {
  return (
    <div
      className="relative p-3 rounded-[10px] h-full"
      style={{ backgroundColor: 'var(--input-background)' }}
    >
      <div className="absolute top-2.5 right-2.5">
        <SkeletonLine width={72} height={26} radius={4} />
      </div>
      <SkeletonLine width="55%" height={12} style={{ marginBottom: "6px" }} />
      <SkeletonLine width="35%" height={9} style={{ marginBottom: "10px" }} />
      <SkeletonLine width="100%" height={9} style={{ marginBottom: "5px" }} />
      <SkeletonLine width="80%" height={9} style={{ marginBottom: "12px" }} />
      <div className="flex gap-3">
        <SkeletonLine width={38} height={8} />
        <SkeletonLine width={38} height={8} />
      </div>
    </div>
  );
}

/** Skeleton danh sách skill. */
export function SkillListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className="grid gap-3.5 px-4 pb-4"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <SkillCardSkeleton key={i} />
        ))}
      </div>
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