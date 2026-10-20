import { useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Pencil,
  Trash2,
} from "lucide-react";
import { isReservedGroupName } from "../../hooks/useSkillWorkspaceState";
// Adjust import path based on Phantoma's actual UI library structure
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown'; 
import { getGroupIcon } from "./iconLibrary";
import { $ } from '@renderer/utils/color';
import { GROUP_ACCENT_COLORS, resolveGroupColor } from "./colorHelpers";

export { GROUP_ACCENT_COLORS, resolveGroupColor };

export interface DrawerSkill {
  slug: string;
  name: string;
  author?: string;
  /** Phần đầu nội dung skill — hiển thị trong tooltip khi hover. */
  preview: string;
}

export interface DrawerGroup {
  name: string;
  /** Skill đã cài thuộc group — dùng để expand + preview. */
  skills: DrawerSkill[];
  /** Tên icon lucide; fallback về icon mặc định nếu chưa có. */
  icon?: string;
  /** Màu accent (hex); fallback theo hash tên group. */
  color?: string;
  description?: string;
}

/** Skill đang hover + vị trí con trỏ — drawer dùng để vẽ tooltip bám chuột. */
export interface SkillPreviewState {
  skill: DrawerSkill;
  x: number;
  y: number;
}

const ellipsis: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

interface GroupTreeProps {
  groups: DrawerGroup[];
  /** true khi đang chọn group để cài skill (có radio chọn group). */
  selectable: boolean;
  selected: string;
  onSelect: (name: string) => void;
  onEdit: (group: DrawerGroup) => void;
  onDelete: (name: string) => void;
  onMoveSkill: (slug: string, groupName: string) => void;
  onDeleteSkill: (skill: DrawerSkill) => void;
  /** Mở skill trong OS file manager. */
  onOpenSkillFolder: (skill: DrawerSkill) => void;
  /** Click skill (khi đang view, không chọn group) → chuyển sang SkillDetail. */
  onOpenSkill: (skill: DrawerSkill) => void;
  /** Báo skill đang hover (null = ẩn tooltip). */
  onPreviewChange: (preview: SkillPreviewState | null) => void;
}

/**
 * Cây group → skill đã cài. Chevron chỉ expand/collapse; click hàng chỉ chọn group
 * (khi selectable). Hover hàng group/skill thay badge/author bằng icon thao tác;
 * chuột phải mở dropdown; kéo skill thả lên group để chuyển.
 */
export function GroupTree({
  groups,
  selectable,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onMoveSkill,
  onDeleteSkill,
  onOpenSkillFolder,
  onOpenSkill,
  onPreviewChange,
}: GroupTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<{
    slug: string;
    from: string;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const hidePreview = () => onPreviewChange(null);

  const trackPreview = (skill: DrawerSkill, e: MouseEvent) =>
    onPreviewChange({ skill, x: e.clientX, y: e.clientY });

  const toggleExpand = (name: string) => {
    hidePreview();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <div
        className="py-6 text-center text-xs opacity-70"
        style={{ color: $('--text-secondary') }}
      >
        No groups found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {groups.map((group) => {
        const isOther = isReservedGroupName(group.name);
        const isSelected = selectable && selected === group.name;
        const isExpanded = expanded.has(group.name);
        const color = resolveGroupColor(group);
        const GroupIcon = getGroupIcon(group.icon);
        const count = group.skills.length;
        const description =
          group.description ??
          (isOther ? "Skills not assigned to any group" : undefined);
        const accentBar = isSelected ? color : "transparent";
        const isDropTarget = !!dragging && dropTarget === group.name;

        const countBadge = (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0"
            style={{
              backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
              color,
            }}
          >
            {count} {count === 1 ? "skill" : "skills"}
          </span>
        );

        return (
          <Dropdown
            key={group.name}
            trigger="contextmenu"
            align="start"
            side="bottom"
          >
            <DropdownTrigger asChild>
              <div
                onDragOver={(e) => {
                  if (!dragging || dragging.from === group.name) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dropTarget !== group.name) setDropTarget(group.name);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setDropTarget(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging && dragging.from !== group.name) {
                    onMoveSkill(dragging.slug, group.name);
                  }
                  setDragging(null);
                  setDropTarget(null);
                }}
                className="rounded-r-lg transition-colors duration-130"
                style={{
                  borderRadius: "2px 10px 10px 2px",
                  backgroundColor: isDropTarget
                    ? `color-mix(in srgb, ${color} 14%, transparent)`
                    : "transparent",
                  outline: isDropTarget ? `1px dashed ${color}` : "none",
                }}
              >
                <div
                  className="sk-group-row flex items-center gap-2 p-2 pr-3 rounded-[2px_10px_10px_2px] cursor-pointer transition-border-color duration-130"
                  onClick={() =>
                    selectable ? onSelect(group.name) : toggleExpand(group.name)
                  }
                  style={{
                    borderLeft: `3px solid ${accentBar}`,
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "Collapse group" : "Expand group"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(group.name);
                    }}
                    className="w-[18px] h-[18px] p-0 border-none rounded bg-transparent flex items-center justify-center shrink-0 cursor-pointer"
                    style={{ color: $('--text-secondary') }}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>

                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
                      color,
                    }}
                  >
                    <GroupIcon size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-semibold truncate"
                      style={{ color: $('--text-primary'), ...ellipsis }}
                    >
                      {group.name}
                    </div>
                    {description && (
                      <div
                        className="text-[11px] opacity-75 mt-0.5 truncate"
                        style={{ color: $('--text-secondary'), ...ellipsis }}
                      >
                        {description}
                      </div>
                    )}
                  </div>

                  {isOther ? (
                    countBadge
                  ) : (
                    <>
                      <span className="sk-swap-idle">{countBadge}</span>
                      <span className="sk-swap-actions">
                        <button
                          type="button"
                          className="sk-action w-[22px] h-[22px] p-0 border-none rounded-md bg-transparent flex items-center justify-center shrink-0 cursor-pointer"
                          title="Edit group"
                          aria-label="Edit group"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(group);
                          }}
                          style={{ color: $('--text-secondary') }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="sk-action sk-action-danger w-[22px] h-[22px] p-0 border-none rounded-md bg-transparent flex items-center justify-center shrink-0 cursor-pointer"
                          title="Delete group"
                          aria-label="Delete group"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(group.name);
                          }}
                          style={{ color: $('--text-secondary') }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </span>
                    </>
                  )}
                </div>

                {isExpanded && (
                  <div
                    className="ml-[55px] mr-2.5 mb-2 pl-2.5 flex flex-col gap-px"
                  >
                    {count === 0 ? (
                      <div
                        className="text-[11px] italic opacity-60 py-1 px-2"
                        style={{ color: $('--text-secondary') }}
                      >
                        No installed skills in this group
                      </div>
                    ) : (
                      group.skills.map((skill, index) => (
                        <div
                          key={skill.slug}
                          onContextMenu={(e) => {
                            e.stopPropagation();
                            hidePreview();
                          }}
                        >
                          <Dropdown
                            trigger="contextmenu"
                            align="start"
                            side="bottom"
                          >
                            <DropdownTrigger asChild>
                              <div
                                className="sk-skill-row flex items-center gap-2 py-1 px-2 rounded-md cursor-grab min-w-0"
                                draggable
                                onDragStart={(e) => {
                                  hidePreview();
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData("text/plain", skill.slug);
                                  setDragging({
                                    slug: skill.slug,
                                    from: group.name,
                                  });
                                }}
                                onDragEnd={() => {
                                  setDragging(null);
                                  setDropTarget(null);
                                }}
                                onMouseEnter={(e) => trackPreview(skill, e)}
                                onMouseMove={(e) => trackPreview(skill, e)}
                                onMouseLeave={hidePreview}
                                onClick={() => {
                                  if (selectable) return;
                                  hidePreview();
                                  onOpenSkill(skill);
                                }}
                              >
                                <span
                                  className="min-w-[16px] text-[11px] tabular-nums shrink-0"
                                  style={{ color }}
                                >
                                  {index + 1}.
                                </span>
                                <span
                                  className="flex-1 min-w-0 text-xs truncate"
                                  style={{ color: $('--text-primary'), ...ellipsis }}
                                >
                                  {skill.name}
                                </span>
                                {skill.author && (
                                  <span
                                    className="sk-swap-idle text-[11px] opacity-65 shrink-0 max-w-[40%] truncate"
                                    style={{ color: $('--text-secondary'), ...ellipsis }}
                                  >
                                    {skill.author}
                                  </span>
                                )}
                                <span className="sk-swap-actions">
                                  <button
                                    type="button"
                                    className="sk-action w-[22px] h-[22px] p-0 border-none rounded-md bg-transparent flex items-center justify-center shrink-0 cursor-pointer"
                                    title="Open skill folder"
                                    aria-label="Open skill folder"
                                    draggable={false}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      hidePreview();
                                      onOpenSkillFolder(skill);
                                    }}
                                    style={{ color: $('--text-secondary') }}
                                  >
                                    <FolderOpen size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    className="sk-action sk-action-danger w-[22px] h-[22px] p-0 border-none rounded-md bg-transparent flex items-center justify-center shrink-0 cursor-pointer"
                                    title="Delete skill"
                                    aria-label="Delete skill"
                                    draggable={false}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      hidePreview();
                                      onDeleteSkill(skill);
                                    }}
                                    style={{ color: $('--text-secondary') }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </span>
                              </div>
                            </DropdownTrigger>
                            <DropdownContent>
                              <DropdownItem
                                icon={<Trash2 size={14} />}
                                variant="error"
                                onClick={() => onDeleteSkill(skill)}
                              >
                                Delete skill
                              </DropdownItem>
                            </DropdownContent>
                          </Dropdown>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </DropdownTrigger>

            {!isOther && (
              <DropdownContent>
                <DropdownItem
                  icon={<Pencil size={14} />}
                  onClick={() => onEdit(group)}
                >
                  Edit group
                </DropdownItem>
                <DropdownItem
                  icon={<Trash2 size={14} />}
                  variant="error"
                  onClick={() => onDelete(group.name)}
                >
                  Delete group
                </DropdownItem>
              </DropdownContent>
            )}
          </Dropdown>
        );
      })}

      <style>{`
        .sk-group-row:hover { background-color: var(--card-background-hover); }
        .sk-skill-row:hover { background-color: var(--card-background-hover); }
        .sk-skill-row:active { cursor: grabbing; }
        .sk-swap-actions { display: none; align-items: center; gap: 2px; flex-shrink: 0; }
        .sk-group-row:hover .sk-swap-idle, .sk-skill-row:hover .sk-swap-idle { display: none; }
        .sk-group-row:hover .sk-swap-actions, .sk-skill-row:hover .sk-swap-actions { display: flex; }
        .sk-action:hover { background-color: color-mix(in srgb, var(--text-primary) 12%, transparent) !important; color: var(--text-primary) !important; }
        .sk-action-danger:hover { background-color: color-mix(in srgb, var(--error) 15%, transparent) !important; color: var(--error) !important; }
      `}</style>
    </div>
  );
}