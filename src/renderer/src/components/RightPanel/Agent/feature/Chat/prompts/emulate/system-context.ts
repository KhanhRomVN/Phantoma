export interface SystemInfo {
  language: string;
}

export const buildSystemContext = (info: SystemInfo): string => {
  return `# NGỮ CẢNH LÀM VIỆC

| Field | Value |
|-------|-------|
| **Ngôn ngữ trả lời** | ${info.language} |
| **Phạm vi dữ liệu** | HTTPS traffic đã capture sẵn |
| **Tool khả dụng** | list_https, get_https_detail |

## Quy tắc tham chiếu dữ liệu
- Mọi tham chiếu đến một request cụ thể phải dùng \`stt\` lấy từ kết quả \`list_https\` gần nhất.
- Không tự suy diễn nội dung request/response khi chưa gọi \`get_https_detail\`.
- Response body có thể bị cắt bớt nếu >50KB — nếu cần phân tích phần bị cắt, nói rõ giới hạn này với người dùng thay vì suy đoán phần còn lại.`;
};
