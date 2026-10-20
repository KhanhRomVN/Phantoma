import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { X, Plus, FolderPlus, Search, Trash2 } from "lucide-react";
import type { SkillSummary } from "../../types/skill.types";
import { isReservedGroupName } from "../../hooks/useSkillWorkspaceState";
import { IconPicker } from "../shared/IconPicker";
import { DEFAULT_GROUP_ICON } from "../shared/iconLibrary";
import {
  GroupTree,
  GROUP_ACCENT_COLORS,
  resolveGroupColor,
  type DrawerGroup,
  type SkillPreviewState,
} from "../shared/GroupTree";
import { $ } from '@renderer/utils/color';

export type { DrawerGroup, DrawerSkill } from "../shared/GroupTree";

export interface GroupMeta {
  icon?: string;
  color?: string;
  description?: string;
}

export interface GroupUpdate extends GroupMeta {
  name: string;
}

interface SkillGroupDrawerProps {
  isOpen: boolean;
  /** Skill cần cài — null nghĩa là chỉ mở để quản lý group. */
  skill: SkillSummary | null;
  /** Danh sách group (đã bao gồm "Others" ở đầu). */
  groups: DrawerGroup[];
  onClose: () => void;
  onConfirmInstall: (groupName: string) => void;
  onCreateGroup: (name: string, meta?: GroupMeta) => void;
  onUpdateGroup: (oldName: string, next: GroupUpdate) => void;
  /** Xóa group — skill trong group sẽ chuyển về "Others". */
  onDeleteGroup: (name: string) => void;
  /** Kéo-thả skill sang group khác ("Others" = bỏ khỏi mọi group). */
  onMoveSkill: (slug: string, groupName: string) => void;
  /** Gỡ cài đặt skill. */
  onDeleteSkill: (slug: string) => void;
  /** Mở skill trong OS file manager. */
  onOpenSkillFolder: (slug: string) => void;
  /** Mở SkillDetail của skill đã cài (chỉ khi đang view, không phải cài skill). */
  onOpenSkill: (slug: string) => void;
}

type PendingDelete =
  | { kind: "group"; name: string; count: number }
  | { kind: "skill"; slug: string; name: string };

interface FormState {
  mode: "create" | "edit";
  original?: string;
  name: string;
  description: string;
  icon: string;
  /** undefined = tự động theo hash tên group. */
  color?: string;
  error: string | null;
}

const NEW_FORM: FormState = {
  mode: "create",
  name: "",
  description: "",
  icon: DEFAULT_GROUP_ICON,
  error: null,
};

// Note: Dashed box background using CSS vars requires careful handling.
// We'll use inline style with resolved values or standard border-dashed if possible.
// For complex repeating gradients, keeping it in a <style> tag or computed style is safer.

const TOOLTIP_OFFSET = 14;
const TOOLTIP_MAX_WIDTH = 340;
const TOOLTIP_MAX_HEIGHT = 320;

/** Đặt lệch phải-dưới con trỏ, tự lật lên trên / sang trái khi thiếu chỗ trong viewport. */
const getTooltipStyle = (p: { x: number; y: number }): CSSProperties => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(TOOLTIP_MAX_WIDTH, vw - 16);
  const left = Math.max(8, Math.min(p.x + TOOLTIP_OFFSET, vw - width - 8));
  const spaceBelow = vh - p.y - TOOLTIP_OFFSET - 8;
  const spaceAbove = p.y - TOOLTIP_OFFSET - 8;
  const below = spaceBelow >= 200 || spaceBelow >= spaceAbove;
  return below
    ? {
        left,
        width,
        top: p.y + TOOLTIP_OFFSET,
        maxHeight: Math.min(TOOLTIP_MAX_HEIGHT, spaceBelow),
      }
    : {
        left,
        width,
        bottom: vh - p.y + TOOLTIP_OFFSET,
        maxHeight: Math.min(TOOLTIP_MAX_HEIGHT, spaceAbove),
      };
};

/** Tooltip xem trước nội dung skill — bám theo con chuột, không delay. */
function SkillPreviewTooltip({ skill, x, y }: SkillPreviewState) {
  return (
    <div className="sk-tip" role="tooltip" style={getTooltipStyle({ x, y })}>
      <div className="sk-tip-title">{skill.name}</div>
      {skill.author && (
        <div className="sk-tip-chips">
          <span className="sk-tip-chip">by {skill.author}</span>
        </div>
      )}
      <div className="sk-tip-label">Content</div>
      {skill.preview ? (
        <div className="sk-tip-preview">{skill.preview}</div>
      ) : (
        <div className="sk-tip-muted">No preview available</div>
      )}
    </div>
  );
}

/**
 * Drawer chọn group để cài skill + quản lý group.
 */
export function SkillGroupDrawer({
  isOpen,
  skill,
  groups,
  onClose,
  onConfirmInstall,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onMoveSkill,
  onDeleteSkill,
  onOpenSkillFolder,
  onOpenSkill,
}: SkillGroupDrawerProps) {
  const [selected, setSelected] = useState("Others");
  const [form, setForm] = useState<FormState | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [preview, setPreview] = useState<SkillPreviewState | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelected(groups[0]?.name ?? "Others");
      setForm(null);
      setSearchQuery("");
      setPendingDelete(null);
      setPreview(null);
    }
  }, [isOpen, groups]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pendingDelete) setPendingDelete(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, pendingDelete]);

  useEffect(() => {
    if (!preview) return;
    const hide = () => setPreview(null);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [!!preview]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q) ||
        g.skills.some((s) => s.name.toLowerCase().includes(q)),
    );
  }, [groups, searchQuery]);

  if (!isOpen) return null;

  const patchForm = (patch: Partial<FormState>) =>
    setForm((prev) => (prev ? { ...prev, ...patch, error: null } : prev));

  const requestDeleteGroup = (name: string) => {
    const group = groups.find((g) => g.name === name);
    setPendingDelete({ kind: "group", name, count: group?.skills.length ?? 0 });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "group") {
      onDeleteGroup(pendingDelete.name);
      if (selected === pendingDelete.name) setSelected("Others");
    } else {
      onDeleteSkill(pendingDelete.slug);
    }
    setPendingDelete(null);
  };

  const openEdit = (group: DrawerGroup) =>
    setForm({
      mode: "edit",
      original: group.name,
      name: group.name,
      description: group.description ?? "",
      icon: group.icon ?? DEFAULT_GROUP_ICON,
      color: group.color,
      error: null,
    });

  const submitForm = () => {
    if (!form) return;
    const name = form.name.trim();
    let error: string | null = null;
    if (!name) {
      error = "Group name cannot be empty";
    } else if (isReservedGroupName(name)) {
      error = `"${name}" is reserved`;
    } else if (
      groups.some(
        (g) =>
          g.name.toLowerCase() === name.toLowerCase() &&
          g.name !== form.original,
      )
    ) {
      error = "Group already exists";
    }
    if (error) {
      setForm({ ...form, error });
      return;
    }
    const meta: GroupMeta = {
      icon: form.icon,
      color: form.color,
      description: form.description.trim() || undefined,
    };
    if (form.mode === "edit" && form.original) {
      onUpdateGroup(form.original, { name, ...meta });
    } else {
      onCreateGroup(name, meta);
    }
    setForm(null);
  };

  // Resolve theme colors for inline styles
  const tertiaryBg = $('--dropdown-background'); // Using dropdown bg for drawer surface as it's elevated
  const borderColor = $('--border');
  const inputBg = $('--input-background');
  const textPrimary = $('--text-primary');
  const textSecondary = $('--text-secondary');
  const primaryColor = $('--primary');
  const errorColor = $('--error');

  const content = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/55 z-[10000] animate-fade-in"
      />
      
      {/* Drawer Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 h-[75%] z-[10001] flex flex-col shadow-[0_-8px_32px_rgba(0,0,0,0.25)] animate-slide-up"
        style={{
          backgroundColor: tertiaryBg,
          borderTop: `1px solid ${borderColor}`,
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between shrink-0"
          style={{ borderColor }}
        >
          <div>
            <div className="text-base font-bold" style={{ color: textPrimary }}>
              {skill ? "Install Skill" : "Manage Groups"}
            </div>
            <div
              className="text-xs opacity-70 mt-0.5 truncate max-w-[240px]"
              style={{ color: textSecondary }}
            >
              {skill ? skill.name : "Create and organize skill groups"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded transition-colors hover:bg-red-500/10 hover:text-red-500"
            style={{ color: textSecondary }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2.5 flex gap-2 items-center shrink-0">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: textSecondary }}
            />
            <input
              type="text"
              placeholder="Search groups or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg outline-none border-none h-[34px] box-border"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setForm(NEW_FORM)}
            title="New group"
            className="w-[34px] h-[34px] rounded-lg border-none cursor-pointer flex items-center justify-center shrink-0"
            style={{
              backgroundColor: inputBg,
              color: textSecondary,
            }}
          >
            <FolderPlus size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-2.5">
          {form && (
            <div className="mb-3">
              <div
                className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: textSecondary }}
              >
                {form.mode === "create" ? "New Group" : "Edit Group"}
              </div>
              <div
                className="flex flex-col gap-2 p-3 rounded-xl border border-dashed"
                style={{ borderColor: `color-mix(in srgb, ${textSecondary} 30%, transparent)` }}
              >
                <div className="flex items-center gap-2">
                  <IconPicker
                    value={form.icon}
                    color={resolveGroupColor({
                      name: form.name.trim() || form.original || "",
                      color: form.color,
                    })}
                    onChange={(icon) => patchForm({ icon })}
                  />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Group name..."
                    value={form.name}
                    onChange={(e) => patchForm({ name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitForm();
                      else if (e.key === "Escape") {
                        e.stopPropagation();
                        setForm(null);
                      }
                    }}
                    className="flex-1 text-sm px-2.5 py-1.5 rounded-lg outline-none border-none"
                    style={{
                      backgroundColor: inputBg,
                      color: textPrimary,
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Description (optional)..."
                  value={form.description}
                  onChange={(e) => patchForm({ description: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitForm();
                  }}
                  className="text-sm px-2.5 py-1.5 rounded-lg outline-none border-none"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                  }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] mr-1" style={{ color: textSecondary }}>
                    Color
                  </span>
                  <button
                    type="button"
                    title="Auto"
                    onClick={() => patchForm({ color: undefined })}
                    className="w-[18px] h-[18px] p-0 rounded-full border border-dashed cursor-pointer shrink-0"
                    style={{
                      borderColor: textSecondary,
                      backgroundColor: 'transparent',
                      outline: form.color === undefined ? `2px solid ${textSecondary}` : 'none',
                      outlineOffset: '2px'
                    }}
                  />
                  {GROUP_ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      onClick={() => patchForm({ color: c })}
                      className="w-[18px] h-[18px] p-0 rounded-full border-none cursor-pointer shrink-0"
                      style={{
                        backgroundColor: c,
                        outline: form.color === c ? `2px solid ${c}` : 'none',
                        outlineOffset: '2px'
                      }}
                    />
                  ))}
                </div>
                {form.error && (
                  <div className="text-[11px]" style={{ color: errorColor }}>
                    {form.error}
                  </div>
                )}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setForm(null)}
                    className="px-3 py-1.5 rounded-md border-none bg-transparent text-xs cursor-pointer"
                    style={{ color: textSecondary }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitForm}
                    className="px-3 py-1.5 rounded-md border-none text-xs font-medium cursor-pointer flex items-center gap-1"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${primaryColor} 18%, transparent)`,
                      color: primaryColor,
                    }}
                  >
                    <Plus size={13} />
                    {form.mode === "create" ? "Create" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {pendingDelete && (
            <div
              className="flex items-center gap-2 px-2.5 py-2 mb-2.5 rounded-lg border"
              style={{
                backgroundColor: `color-mix(in srgb, ${errorColor} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${errorColor} 35%, transparent)`,
              }}
            >
              <Trash2 size={14} style={{ color: errorColor, flexShrink: 0 }} />
              <div
                className="flex-1 min-w-0 text-xs"
                style={{ color: textPrimary }}
              >
                {pendingDelete.kind === "group"
                  ? pendingDelete.count > 0
                    ? `Delete group "${pendingDelete.name}"? ${pendingDelete.count} skill(s) will move to Others.`
                    : `Delete group "${pendingDelete.name}"?`
                  : `Uninstall skill "${pendingDelete.name}"?`}
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-3 py-1.5 rounded-md border-none bg-transparent text-xs cursor-pointer"
                style={{ color: textSecondary }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-1.5 rounded-md border-none text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: `color-mix(in srgb, ${errorColor} 18%, transparent)`,
                  color: errorColor,
                }}
              >
                Delete
              </button>
            </div>
          )}

          <GroupTree
            groups={filteredGroups}
            selectable={!!skill}
            selected={selected}
            onSelect={setSelected}
            onEdit={openEdit}
            onDelete={requestDeleteGroup}
            onMoveSkill={onMoveSkill}
            onDeleteSkill={(s) =>
              setPendingDelete({ kind: "skill", slug: s.slug, name: s.name })
            }
            onOpenSkillFolder={(s) => onOpenSkillFolder(s.slug)}
            onOpenSkill={(s) => onOpenSkill(s.slug)}
            onPreviewChange={setPreview}
          />
        </div>

        {/* Footer Actions (only when installing) */}
        {skill && (
          <div
            className="flex justify-end gap-2 px-4 py-3 border-t shrink-0"
            style={{ borderColor }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border-none text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: `color-mix(in srgb, ${textSecondary} 8%, transparent)`,
                color: textSecondary,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirmInstall(selected)}
              className="px-3.5 py-2 rounded-lg border-none text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              style={{
                backgroundColor: `color-mix(in srgb, ${primaryColor} 18%, transparent)`,
                color: primaryColor,
              }}
            >
              <Plus size={13} />
              Install
            </button>
          </div>
        )}
      </div>

      {preview && <SkillPreviewTooltip {...preview} />}

      <style>{`
        @keyframes skDrawerSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes skDrawerFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: skDrawerSlideUp 0.22s ease-out forwards; }
        .animate-fade-in { animation: skDrawerFadeIn 0.15s ease-out forwards; }
        
        /* Tooltip Styles */
        .sk-tip { position: fixed; z-index: 10010; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; padding: 12px; overflow: hidden; pointer-events: none; border-radius: 12px; background: var(--tooltip-background); border: 1px solid var(--border); box-shadow: 0 12px 32px rgba(0,0,0,.35); }
        .sk-tip-title { font-size: 13px; font-weight: 600; line-height: 1.35; color: var(--text-primary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
        .sk-tip-chips { display: flex; flex-wrap: wrap; gap: 5px; }
        .sk-tip-chip { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 500; color: var(--text-secondary); background: color-mix(in srgb, var(--text-primary) 7%, transparent); }
        .sk-tip-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-secondary); opacity: .8; }
        .sk-tip-preview { font-size: 12px; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; padding: 8px 10px; border-radius: 4px; background: color-mix(in srgb, var(--text-primary) 5%, transparent); display: -webkit-box; -webkit-line-clamp: 9; -webkit-box-orient: vertical; overflow: hidden; }
        .sk-tip-muted { font-size: 12px; color: var(--text-secondary); font-style: italic; }
      `}</style>
    </>
  );

  return createPortal(content, document.body);
}