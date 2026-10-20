/**
 * ------------------------------------------------------------------
 * Question Utils
 * ------------------------------------------------------------------
 * Helper functions xử lý logic liên quan đến question block.
 * ------------------------------------------------------------------
 */

/**
 * Kiểm tra question đã được trả lời đầy đủ chưa dựa vào selectedOption.
 * selectedOption có thể chứa JSON với questionId và allAnswered.
 */
export function isQuestionFullyAnswered(selectedOption?: string | null): boolean {
  if (!selectedOption) return false;
  try {
    const parsed = JSON.parse(selectedOption);
    if (parsed && typeof parsed === 'object' && 'questionId' in parsed && parsed.allAnswered !== true) {
      return false;
    }
  } catch {
    // Not JSON — treat as answered
  }
  return true;
}