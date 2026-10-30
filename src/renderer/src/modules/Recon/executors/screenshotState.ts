// Lưu file_id của screenshot mới nhất để đưa vào ref_file_ids khi gửi message tiếp theo
let lastScreenshotFileId: string | null = null;

export const getLastScreenshotFileId = (): string | null => lastScreenshotFileId;
export const clearLastScreenshotFileId = (): void => {
  lastScreenshotFileId = null;
};
export const setLastScreenshotFileId = (id: string | null): void => {
  lastScreenshotFileId = id;
};