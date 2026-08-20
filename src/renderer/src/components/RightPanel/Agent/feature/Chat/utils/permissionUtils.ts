import { TAG_REGISTRY } from "../constants/constants";
import { PermissionMode, PermissionValue } from "../types/tag-types";

/**
 * Trả về quyết định quyền cho một loại tool và chế độ quyền đã cho.
 * - "allow"   → thực thi ngay không cần hỏi
 * - "confirm" → tạm dừng và hỏi người dùng (hiển thị nút Accept/Reject)
 * - "reject"  → chặn thực thi hoàn toàn
 */
export const getPermissionDecision = (
  mode: PermissionMode,
  toolType: string,
): "allow" | "confirm" | "reject" => {
  const tagDef = TAG_REGISTRY[toolType];

  // Nếu không tìm thấy hoặc không phải tool hoặc không có permissions
  if (!tagDef || tagDef.category !== "tool" || !tagDef.permissions) {
    return "reject";
  }

  let permissionValue: PermissionValue;

  switch (mode) {
    case "fullAccess":
      permissionValue = tagDef.permissions.fullAccess;
      break;
    case "approval":
      permissionValue = tagDef.permissions.approval;
      break;
    default:
      return "reject";
  }

  // Nếu là string, return trực tiếp
  if (typeof permissionValue === "string") {
    return permissionValue;
  }

  // Nếu là regex, kiểm tra match
  if (permissionValue instanceof RegExp) {
    return permissionValue.test(toolType) ? "allow" : "reject";
  }

  return "reject";
};
