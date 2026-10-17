/**
 * ------------------------------------------------------------------
 * Question Parser
 * ------------------------------------------------------------------
 * Parse <question> tag thành structured question data.
 * Hỗ trợ cả 2 format:
 *   - Legacy: <option>...</option> list với title optional
 *   - New schema: <q id type label>...</q> elements với <option> con
 *
 * Main function:
 * - parseQuestion() : Parse inner content của <question> tag
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
import type { Question, QuestionType } from '../../types/message';

export interface ParsedQuestion {
  options: string[];
  title?: string;
  optional?: boolean;
  questions?: Question[];
}

// ─── Functions ──────────────────────────────────────────────────────────

/**
 * Parse question tag content into structured question data.
 * Supports both legacy (options array) and new (questions array with <q> elements) formats.
 */
export const parseQuestion = (innerContent: string): ParsedQuestion => {
  const options: string[] = [];
  let title: string | undefined = undefined;
  const questions: Question[] = [];

  // Extract title if present (legacy)
  const titleMatch = /<question_title>([\s\S]*?)<\/question_title>/i.exec(innerContent);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Try to parse new schema with <q> elements
  let hasNewSchema = false;
  const content = innerContent || '';

  // Find each <q> tag individually by scanning for opening tags
  let searchIndex = 0;
  while (searchIndex < content.length) {
    const qStart = content.indexOf('<q ', searchIndex);
    if (qStart === -1) break;

    // Find the end of the opening tag (> or />)
    let tagEnd = -1;
    let isSelfClosing = false;
    let i = qStart + 2;

    while (i < content.length) {
      if (content[i] === '<' && content[i + 1] === '/') {
        break;
      }
      if (content[i] === '>' && content[i - 1] === '/') {
        isSelfClosing = true;
        tagEnd = i;
        break;
      }
      if (content[i] === '>') {
        tagEnd = i;
        break;
      }
      i++;
    }

    if (tagEnd === -1) {
      searchIndex = qStart + 2;
      continue;
    }

    const openTag = content.substring(qStart, tagEnd + 1);
    const idMatch = openTag.match(/id="([^"]+)"/);
    const typeMatch = openTag.match(/type="([^"]+)"/);

    // Support both double quotes and single quotes for label attribute
    let qLabel = '';
    const doubleQuoteMatch = openTag.match(/label="([^"]*)"/);
    const singleQuoteMatch = openTag.match(/label='([^']*)'/);
    if (doubleQuoteMatch) {
      qLabel = doubleQuoteMatch[1].trim();
    } else if (singleQuoteMatch) {
      qLabel = singleQuoteMatch[1].trim();
    }

    // Decode HTML entities if present
    if (qLabel) {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = qLabel;
      qLabel = textarea.value;
    }

    if (!idMatch || !typeMatch) {
      searchIndex = tagEnd + 1;
      continue;
    }

    hasNewSchema = true;
    const qId = idMatch[1].trim();
    const qType = typeMatch[1].trim() as QuestionType;

    let qInner = '';
    let closeTagEnd = tagEnd;

    if (!isSelfClosing) {
      const closeIndex = content.indexOf('</q>', tagEnd + 1);
      if (closeIndex === -1) {
        closeTagEnd = tagEnd;
      } else {
        qInner = content.substring(tagEnd + 1, closeIndex);
        closeTagEnd = closeIndex + 4;
      }
    } else {
      closeTagEnd = tagEnd + 1;
    }

    const qOptions: string[] = [];
    if (qInner.trim()) {
      const optionRegex = /<option>([\s\S]*?)<\/option>/gi;
      let optMatch;
      while ((optMatch = optionRegex.exec(qInner)) !== null) {
        if (optMatch[1].trim()) {
          qOptions.push(optMatch[1].trim());
        }
      }
    }

    // For single/multi, ensure we have at least 2 options
    if (qType === 'single' || qType === 'multi') {
      if (qOptions.length < 2) {
        console.warn(
          `[Phantoma][Question] ⚠️ SKIPPING question "${qId}" - type ${qType} needs at least 2 options, got ${qOptions.length}`,
        );
        searchIndex = closeTagEnd;
        continue;
      }
    }

    const question: Question = {
      id: qId,
      type: qType,
      label: qLabel || `Question ${questions.length + 1}`,
      options: qOptions.length > 0 ? qOptions : undefined,
    };

    questions.push(question);
    searchIndex = closeTagEnd;
  }

  // If no new schema found, fall back to legacy parsing
  if (!hasNewSchema) {
    const optionRegex = /<option>([\s\S]*?)<\/option>/gi;
    let optMatch;
    while ((optMatch = optionRegex.exec(innerContent || '')) !== null) {
      if (optMatch[1].trim()) {
        options.push(optMatch[1].trim());
      }
    }
  }

  // Extract optional attribute from <question ...> opening tag if present.
  // The caller already knows the opening tag; we try to match from innerContent prefix.
  // `optional` flag is typically checked by caller from the full tag match.

  return {
    options: options.length > 0 ? options : [],
    title,
    ...(questions.length > 0 ? { questions } : {}),
  };
};