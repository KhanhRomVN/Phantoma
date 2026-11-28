/**
 * View-model types dùng chung giữa SkillPanel, SkillGroupModal và GroupTree.
 */

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
