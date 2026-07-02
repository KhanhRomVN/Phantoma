export const buildAccessModePrompt = (mode: string): string => {
  const isReadOnly = mode === 'readOnly';
  const category = isReadOnly ? 'read-only' : 'action';

  return `# PERMISSION MODE: ${mode} (${category})

Cả hai mode (readOnly và fullAccess/approval) đều cho phép sử dụng list_https và get_https_detail, vì đây là 2 tool chỉ đọc dữ liệu traffic đã capture sẵn, không có thao tác ghi/thay đổi nào.

Permission mode ở đây chỉ mang tính hiển thị trạng thái, không giới hạn thêm chức năng nào so với 2 tool hiện có.`;
};
