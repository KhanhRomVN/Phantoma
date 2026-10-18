/**
 * ------------------------------------------------------------------
 * Skill Install Service (IPC)
 * ------------------------------------------------------------------
 * Giao tiếp với main process để quản lý danh sách skill đã cài.
 * Mapped from Zen to Phantoma architecture.
 * ------------------------------------------------------------------
 */

import type { SkillSummary, SkillDetail } from '../types/skill.types';

export type InstalledSkill = SkillSummary | SkillDetail;

interface SkillApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function invokeSkillApi<T>(command: string, payload?: any): Promise<T | null> {
  try {
    const api = (window as any).api;
    if (!api?.invoke) return null;
    const res: SkillApiResponse<T> = await api.invoke(command, payload);
    if (res?.success) {
      return res.data ?? null;
    }
    throw new Error(res?.error || 'Unknown error');
  } catch (err) {
    console.error(`[SkillInstallService] ${command} failed:`, err);
    return null;
  }
}

/** Đọc toàn bộ skill đã cài từ main process. */
export async function listInstalledSkills(): Promise<InstalledSkill[]> {
  const data = await invokeSkillApi<InstalledSkill[]>('skill:list-installed');
  return Array.isArray(data) ? data : [];
}

/** Lưu 1 skill vào thư mục skills/. */
export async function installSkill(skill: SkillSummary | SkillDetail): Promise<boolean> {
  const result = await invokeSkillApi<boolean>('skill:install', { skill });
  return !!result;
}

/** Xoá skill khỏi thư mục skills/ theo slug. */
export async function uninstallSkill(slug: string): Promise<boolean> {
  const result = await invokeSkillApi<boolean>('skill:uninstall', { slug });
  return !!result;
}

/** Đọc nội dung SKILL.md của skill đã cài; null nếu chưa cài / không có file. */
export async function readSkillContent(slug: string): Promise<string | null> {
  return invokeSkillApi<string>('skill:read-content', { slug });
}