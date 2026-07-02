export const PERSISTENT_RULES = `<persistent-rules>
Every response MUST start with a __THINKING_1__ block containing two sections: "Pass 1 (Plan)" and "Pass 2 (Verify)". No exceptions.
</persistent-rules>`;

/**
 * Full permission mode tag — injected in user-initiated requests only.
 */
export const buildPermissionModeTag = (mode: string): string => {
  const isReadOnly = mode === 'readOnly';
  const category = isReadOnly ? 'read-only' : 'action';

  return `<permission-mode>
Active: ${mode} (${category})
Cả hai mode đều cho phép list_https và get_https_detail — đây là 2 tool duy nhất, luôn chỉ đọc dữ liệu traffic, không có thao tác ghi/thay đổi.
</permission-mode>`;
};

/**
 * Compact permission mode tag — injected in auto/tool-flush requests only.
 * Contains only the active mode name and category to keep token usage minimal.
 */
export const buildPermissionModeTagCompact = (mode: string): string => {
  const category = mode === 'readOnly' ? 'read-only' : 'action';
  return `<permission-mode>Active: ${mode} (${category}). Không giới hạn thêm gì so với 2 tool hiện có (list_https, get_https_detail).</permission-mode>`;
};
