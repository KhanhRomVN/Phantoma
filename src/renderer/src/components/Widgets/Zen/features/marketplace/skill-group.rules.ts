/**
 * Pure rules cho tên group — không phụ thuộc React/UI/service.
 */

/** Tên group mặc định cho skill không thuộc group nào. */
export const DEFAULT_GROUP_NAME = "Others";

/** Chuẩn hoá tên để so sánh group (case-insensitive, trim). */
export function normalizeGroupName(name: string): string {
  return name.trim().toLowerCase();
}

/** Kiểm tra tên group có bị cấm (trùng group mặc định "Others"). */
export function isReservedGroupName(name: string): boolean {
  return normalizeGroupName(name) === normalizeGroupName(DEFAULT_GROUP_NAME);
}
