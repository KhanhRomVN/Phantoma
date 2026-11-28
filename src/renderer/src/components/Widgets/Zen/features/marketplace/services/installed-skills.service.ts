/**
 * ------------------------------------------------------------------
 * Installed Skills Service (IPC)
 * ------------------------------------------------------------------
 * Skill đã cài ở local: list / install / uninstall / read-content / open-folder.
 * Lỗi được throw (không biến thành null/false/[]) để caller phân biệt
 * "chưa cài gì" với "không đọc được".
 * ------------------------------------------------------------------
 */

import type {
  InstalledSkill,
  SkillSummary,
  SkillDetail,
} from "../types/skill.types";
import { invokeSkillIpc } from "./skill-ipc.bridge";

/** Đọc toàn bộ skill đã cài từ main process. */
export async function listInstalledSkills(): Promise<InstalledSkill[]> {
  const data = await invokeSkillIpc<InstalledSkill[]>("skill:list-installed");
  if (!Array.isArray(data)) {
    throw new Error("Invalid installed skills response");
  }
  return data;
}

/** Lưu 1 skill vào thư mục skills/. Resolve khi main xác nhận thành công. */
export async function installSkill(
  skill: SkillSummary | SkillDetail,
): Promise<void> {
  const result = await invokeSkillIpc<boolean>("skill:install", { skill });
  if (result === false) throw new Error("Install was rejected by main process");
}

/** Xoá skill khỏi thư mục skills/ theo slug. Resolve khi main xác nhận thành công. */
export async function uninstallSkill(slug: string): Promise<void> {
  const result = await invokeSkillIpc<boolean>("skill:uninstall", { slug });
  if (result === false) throw new Error("Uninstall was rejected by main process");
}

/** Đọc nội dung SKILL.md của skill đã cài; null nếu không có file. */
export async function readSkillContent(slug: string): Promise<string | null> {
  const data = await invokeSkillIpc<string>("skill:read-content", { slug });
  return data ?? null;
}

/** Mở thư mục skill trong OS file manager. */
export async function openSkillFolder(slug: string): Promise<void> {
  await invokeSkillIpc("skill:open-folder", { slug });
}
