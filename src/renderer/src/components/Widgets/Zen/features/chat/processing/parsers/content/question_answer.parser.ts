/**
 * ------------------------------------------------------------------
 * Question Answer Parser
 * ------------------------------------------------------------------
 * Parse <question-answer> tag thành map questionId -> QuestionAnswer.
 * Mỗi dòng có dạng "N. answer"; N được dùng làm questionId.
 * ------------------------------------------------------------------
 */

import type { QuestionAnswer } from '../../../types/message.types';

export const parseQuestionAnswerTag = (content: string): Record<string, QuestionAnswer> | null => {
  const regex = /<question-answer>([\s\S]*?)<\/question-answer>/i;
  const match = regex.exec(content);
  if (!match) return null;

  const innerContent = match[1].trim();
  const answers: Record<string, QuestionAnswer> = {};

  const lines = innerContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    const lineMatch = /^(\d+)\.\s*(.*)$/i.exec(trimmed);
    if (!lineMatch) continue;

    const lineNumber = parseInt(lineMatch[1], 10);
    const answerText = lineMatch[2].trim();
    const questionId = String(lineNumber);

    if (!answerText) {
      continue;
    }

    let parsedValue: string | string[] | boolean = answerText;

    if (answerText.toLowerCase() === 'true') {
      parsedValue = true;
    } else if (answerText.toLowerCase() === 'false') {
      parsedValue = false;
    }

    answers[questionId] = {
      questionId,
      value: parsedValue,
    };
  }

  return Object.keys(answers).length > 0 ? answers : null;
};