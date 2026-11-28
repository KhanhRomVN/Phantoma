/**
 * ------------------------------------------------------------------
 * SkillPanel — entry của SKILL tab.
 * ------------------------------------------------------------------
 * Compose 3 hook (catalog / installed / groups) và điều phối workflow:
 *   install: pending → install thành công → gán group → đóng modal
 *   uninstall: thành công → loại slug khỏi group (mọi entry point)
 * ------------------------------------------------------------------
 */

import React, { useState } from "react";
import { Archive, Search } from "lucide-react";
import { useSkillMarketplace } from "../hooks/useSkillMarketplace";
import { useInstalledSkills } from "../hooks/useInstalledSkills";
import { useSkillGroups } from "../hooks/useSkillGroups";
import { DEFAULT_GROUP_NAME } from "../skill-group.rules";
import { createSkillExcerpt } from "../skill-presentation";
import { SkillList } from "./skills/SkillList";
import { SkillDetail, SkillDetailSkeleton } from "./skills/SkillDetail";
import { ErrorState } from "./skills/SkillStates";
import { SkillGroupModal } from "./groups/SkillGroupModal";
import type { DrawerGroup, DrawerSkill } from "./groups/group.types";
import type { SkillSummary, SkillDetail as SkillDetailData } from "../types/skill.types";
import { $ } from '@renderer/utils/color';

/* ==================================================================
 * SkillSearchBar — thanh tìm kiếm skill.
 * ================================================================== */

interface SkillSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  /** Nội dung bên phải searchbar — thường là các button action. */
  rightSlot?: React.ReactNode;
}

function SkillSearchBar({
  value,
  onChange,
  onClear,
  rightSlot,
}: SkillSearchBarProps) {
  const inputBg = $('--input-background');
  const textPrimary = $('--text-primary');
  const textSecondary = $('--text-secondary');

  return (
    <div className="px-4 py-3 shrink-0">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search skills..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-8 py-2 text-sm rounded-lg outline-none border-none box-border h-[34px]"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
            }}
          />
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: textSecondary }}
          />
          {value && (
            <button
              type="button"
              onClick={onClear}
              title="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 border-none bg-transparent cursor-pointer text-sm flex items-center leading-none"
              style={{ color: textSecondary }}
            >
              ×
            </button>
          )}
        </div>
        {rightSlot}
      </div>
    </div>
  );
}

/* ==================================================================
 * SkillPanel
 * ================================================================== */

const iconButtonClass = "w-[34px] h-[34px] box-border rounded-lg border-none cursor-pointer flex items-center justify-center shrink-0";

export function SkillPanel({
  header,
}: { header?: React.ReactNode } = {}) {
  const {
    skills,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    searchLoading,
    selectedSkill,
    detailLoading,
    detailError,
    loadLeaderboard,
    handleSkillClick,
    handleBack,
    handleClearSearch,
  } = useSkillMarketplace();

  const installed = useInstalledSkills();
  const groups = useSkillGroups();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingInstallSkill, setPendingInstallSkill] =
    useState<SkillSummary | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  // Chưa biết chính xác trạng thái cài đặt / group → không cho thao tác.
  const installedUnknown = installed.installedLoading || !!installed.loadError;
  const groupsReady = groups.status === "ready";

  const closeDrawer = () => {
    setDrawerOpen(false);
    setPendingInstallSkill(null);
    setInstallError(null);
  };

  const openInstallDrawer = (skill: SkillSummary) => {
    if (installedUnknown || !groupsReady) return;
    setInstallError(null);
    setPendingInstallSkill(skill);
    setDrawerOpen(true);
  };

  const openGroupManagerDrawer = () => {
    setInstallError(null);
    setPendingInstallSkill(null);
    setDrawerOpen(true);
  };

  /** Uninstall thống nhất: chỉ đồng bộ group sau khi main xác nhận thành công. */
  const handleUninstall = async (slug: string): Promise<boolean> => {
    const ok = await installed.uninstall(slug);
    if (ok) groups.assignSkillToGroup(slug, DEFAULT_GROUP_NAME);
    return ok;
  };

  const handleConfirmInstall = async (groupName: string) => {
    if (!pendingInstallSkill || installing) return;
    setInstalling(true);
    setInstallError(null);
    try {
      const ok = await installed.install(pendingInstallSkill);
      if (!ok) {
        setInstallError("Install failed. Please try again.");
        return;
      }
      if (groupName !== DEFAULT_GROUP_NAME && pendingInstallSkill.slug) {
        groups.assignSkillToGroup(pendingInstallSkill.slug, groupName);
      }
      closeDrawer();
    } finally {
      setInstalling(false);
    }
  };

  /** Toggle từ SkillDetail: cài vào Others hoặc gỡ cài đặt. */
  const handleToggleInstall = async (skill: SkillDetailData) => {
    const slug = skill.slug;
    if (!slug || installedUnknown) return;
    if (installed.installedSlugs.has(slug)) {
      await handleUninstall(slug);
    } else {
      await installed.install(skill);
    }
  };

  if (detailLoading) {
    return <SkillDetailSkeleton />;
  }

  if (detailError) {
    return (
      <ErrorState
        message={detailError}
        onRetry={handleBack}
        retryLabel="Back to skills"
      />
    );
  }

  if (selectedSkill) {
    return (
      <SkillDetail
        skill={selectedSkill}
        installed={
          !!selectedSkill.slug && installed.installedSlugs.has(selectedSkill.slug)
        }
        onBack={handleBack}
        onToggleInstall={handleToggleInstall}
      />
    );
  }

  // Group view-model: chỉ dùng skill có slug thật, không lấy name làm slug.
  const drawerSkillMap = new Map<string, DrawerSkill>();
  for (const s of installed.installedSkills) {
    if (!s.slug) continue;
    drawerSkillMap.set(s.slug, {
      slug: s.slug,
      name: s.name || s.slug,
      author: s.author,
      preview: createSkillExcerpt({
        content: "content" in s ? s.content : undefined,
        description: s.description,
      }),
    });
  }
  const assignedSlugs = new Set(groups.state.groups.flatMap((g) => g.slugs));
  const drawerGroups: DrawerGroup[] = [
    {
      name: DEFAULT_GROUP_NAME,
      skills: Array.from(drawerSkillMap.values()).filter(
        (s) => !assignedSlugs.has(s.slug),
      ),
    },
    ...groups.state.groups.map((g) => ({
      name: g.name,
      icon: g.icon,
      color: g.color,
      description: g.description,
      skills: g.slugs.flatMap((slug) => {
        const s = drawerSkillMap.get(slug);
        return s ? [s] : [];
      }),
    })),
  ];

  const inputBg = $('--input-background');
  const textSecondary = $('--text-secondary');

  const rightSlot = (
    <button
      type="button"
      onClick={openGroupManagerDrawer}
      title="Manage installed skills"
      className={iconButtonClass}
      style={{
        backgroundColor: inputBg,
        color: textSecondary,
      }}
    >
      <Archive size={16} />
    </button>
  );

  return (
    <div className="h-full flex flex-col">
      {header}
      <SkillSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={handleClearSearch}
        rightSlot={rightSlot}
      />
      <SkillList
        skills={skills}
        loading={loading}
        searchLoading={searchLoading}
        error={error}
        searchQuery={searchQuery}
        installedSlugs={installed.installedSlugs}
        onRetry={loadLeaderboard}
        onSkillClick={handleSkillClick}
        onInstallClick={openInstallDrawer}
        onUninstall={(skill) => {
          if (!installedUnknown) void handleUninstall(skill.slug);
        }}
      />

      <SkillGroupModal
        isOpen={drawerOpen}
        skill={pendingInstallSkill}
        groups={drawerGroups}
        installing={installing}
        installError={installError ?? installed.actionError}
        onClose={closeDrawer}
        onConfirmInstall={handleConfirmInstall}
        onCreateGroup={(name, meta) =>
          groups.addGroup(name, meta?.icon, {
            color: meta?.color,
            description: meta?.description,
          })
        }
        onUpdateGroup={groups.updateGroup}
        onDeleteGroup={groups.removeGroup}
        onMoveSkill={groups.assignSkillToGroup}
        onOpenSkillFolder={(slug) => void installed.openFolder(slug)}
        onOpenSkill={(slug) => {
          closeDrawer();
          void handleSkillClick({ slug });
        }}
        onDeleteSkill={(slug) => void handleUninstall(slug)}
      />
    </div>
  );
}
