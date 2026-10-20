/**
 * ------------------------------------------------------------------
 * MarketplacePanel
 * ------------------------------------------------------------------
 * Marketplace với 2 tab: SKILL, MCP. Bao gồm luôn SkillPanel
 * (SKILL tab), SkillSearchBar và SkillGroupDrawer để tránh vòng import.
 * Shared state UIs nằm ở ./components/shared/StateViews.
 *
 * Mapped from Zen to Phantoma (Tailwind + IPC).
 * ------------------------------------------------------------------
 */

import React, { useState } from "react";
import { Archive, Search, X } from "lucide-react";
import { useSkillMarketplace } from "./hooks/useSkillMarketplace";
import {
  useSkillWorkspaceState,
  DEFAULT_GROUP_NAME,
} from "./hooks/useSkillWorkspaceState";
import { SkillList } from "./components/Skill/SkillList";
import {
  SkillDetail,
  SkillDetailSkeleton,
} from "./components/Skill/SkillDetail";

import { MCPPanel } from "./components/MCPPanel";
import { ErrorState } from "./components/shared/StateViews";
import {
  SkillGroupDrawer,
  type DrawerGroup,
  type DrawerSkill,
} from "./components/Skill/SkillGroupDrawer";
import { buildSkillPreview } from "./utils/skillPreview";
import type { SkillSummary } from "./types/skill.types";
import { extensionService } from '../../services/ExtensionService';
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
 * SkillPanel — entry của SKILL tab.
 * ================================================================== */

const iconButtonClass = "w-[34px] h-[34px] box-border rounded-lg border-none cursor-pointer flex items-center justify-center shrink-0";

export function SkillPanel() {
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
    installedSkills,
    installedSlugs,
    loadLeaderboard,
    handleSkillClick,
    handleBack,
    handleClearSearch,
    handleInstall,
    handleUninstall,
    handleToggleInstall,
  } = useSkillMarketplace();

  const workspaceState = useSkillWorkspaceState();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingInstallSkill, setPendingInstallSkill] =
    useState<SkillSummary | null>(null);

  const openInstallDrawer = (skill: SkillSummary) => {
    setPendingInstallSkill(skill);
    setDrawerOpen(true);
  };

  const openGroupManagerDrawer = () => {
    setPendingInstallSkill(null);
    setDrawerOpen(true);
  };

  const handleConfirmInstall = async (groupName: string) => {
    if (!pendingInstallSkill) return;
    await handleInstall(pendingInstallSkill);
    if (groupName !== DEFAULT_GROUP_NAME && pendingInstallSkill.slug) {
      workspaceState.assignSkillToGroup(pendingInstallSkill.slug, groupName);
    }
    setDrawerOpen(false);
    setPendingInstallSkill(null);
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
          !!selectedSkill.slug && installedSlugs.has(selectedSkill.slug)
        }
        onBack={handleBack}
        onToggleInstall={handleToggleInstall}
      />
    );
  }

  // Drawer group list construction
  const drawerSkillMap = new Map<string, DrawerSkill>();
  for (const s of installedSkills) {
    const key = s.slug || s.name;
    if (!key) continue;
    drawerSkillMap.set(key, {
      slug: key,
      name: s.name || key,
      author: s.author,
      preview: buildSkillPreview({
        content: "content" in s ? s.content : undefined,
        description: s.description,
      }),
    });
  }
  const assignedSlugs = new Set(
    workspaceState.state.groups.flatMap((g) => g.slugs),
  );
  const drawerGroups: DrawerGroup[] = [
    {
      name: DEFAULT_GROUP_NAME,
      skills: Array.from(drawerSkillMap.values()).filter(
        (s) => !assignedSlugs.has(s.slug),
      ),
    },
    ...workspaceState.state.groups.map((g) => ({
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
        installedSlugs={installedSlugs}
        onRetry={loadLeaderboard}
        onSkillClick={handleSkillClick}
        onInstallClick={openInstallDrawer}
        onUninstall={(skill) => handleUninstall(skill.slug)}
      />

      <SkillGroupDrawer
        isOpen={drawerOpen}
        skill={pendingInstallSkill}
        groups={drawerGroups}
        onClose={() => {
          setDrawerOpen(false);
          setPendingInstallSkill(null);
        }}
        onConfirmInstall={handleConfirmInstall}
        onCreateGroup={(name, meta) =>
          workspaceState.addGroup(name, meta?.icon, {
            color: meta?.color,
            description: meta?.description,
          })
        }
        onUpdateGroup={workspaceState.updateGroup}
        onDeleteGroup={(name) => workspaceState.removeGroup(name)}
        onMoveSkill={workspaceState.assignSkillToGroup}
        onOpenSkillFolder={(slug) =>
          extensionService.postMessage({ command: "openSkillFolder", slug })
        }
        onOpenSkill={(slug) => {
          setDrawerOpen(false);
          handleSkillClick({ slug } as SkillSummary);
        }}
        onDeleteSkill={async (slug) => {
          await handleUninstall(slug);
          workspaceState.assignSkillToGroup(slug, DEFAULT_GROUP_NAME);
        }}
      />
    </div>
  );
}

/* ==================================================================
 * MarketplacePanel — panel chính với 2 tab SKILL / MCP.
 * ================================================================== */

interface MarketplacePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MarketplacePanel: React.FC<MarketplacePanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [closeHover, setCloseHover] = useState(false);
  const [activeTab, setActiveTab] = useState("SKILL");

  if (!isOpen) return null;

  const borderColor = $('--border');
  const secondaryBg = $('--background'); // Using main background as surface for full-screen overlay
  const tertiaryBg = $('--card-background'); // Header/Tab bar background
  const textPrimary = $('--text-primary');
  const textSecondary = $('--text-secondary');
  const primaryColor = $('--primary');
  const errorColor = $('--error');

  return (
    <div
      className="absolute inset-0 w-full h-full z-[1000] flex flex-col"
      style={{
        borderTop: `1px solid ${borderColor}`,
        backgroundColor: secondaryBg,
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-2 shrink-0"
        style={{ backgroundColor: tertiaryBg }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="mb-1">
                <span
                  className="font-bold text-base tracking-wide"
                  style={{ color: textPrimary }}
                >
                  Marketplace
                </span>
              </div>
              <p
                className="m-0 text-sm opacity-70 leading-snug"
                style={{ color: textSecondary }}
              >
                Install skills and MCP servers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            onMouseEnter={() => setCloseHover(true)}
            onMouseLeave={() => setCloseHover(false)}
            className="p-1.5 rounded-md shrink-0 border-none cursor-pointer transition-all duration-150 flex items-center justify-center"
            style={{
              backgroundColor: closeHover
                ? `color-mix(in srgb, ${errorColor} 12%, transparent)`
                : `color-mix(in srgb, ${textSecondary} 10%, transparent)`,
              color: closeHover ? errorColor : textSecondary,
            }}
            title="Close Marketplace"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tabbar */}
      <div
        className="flex items-center gap-1 px-4 border-b shrink-0"
        style={{
          borderBottomColor: borderColor,
          backgroundColor: tertiaryBg,
        }}
      >
        {["SKILL", "MCP"].map((tab) => (
          <span
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-2.5 text-sm cursor-pointer select-none transition-all duration-150"
            style={{
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? textPrimary : textSecondary,
              borderBottom: activeTab === tab ? `2px solid ${primaryColor}` : '2px solid transparent',
            }}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "SKILL" && <SkillPanel />}
        {activeTab === "MCP" && <MCPPanel />}
      </div>
    </div>
  );
};

export default MarketplacePanel;

/* Re-export state UIs để code cũ import từ "./index" vẫn hoạt động. */
export {
  SkeletonLine,
  ErrorState,
  EmptyState,
  EmptyInstalledState,
  NoResultsState,
} from "./components/shared/StateViews";