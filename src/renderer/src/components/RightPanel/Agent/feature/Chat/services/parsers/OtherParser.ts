import type { Question, QuestionType } from '../../types/message';
import { findClosingTagPosition } from '../../utils/TagClosingFinder';
import { getAllToolTypes } from '../../constants/constants';

// ===== MarkdownParser =====

export const parseMarkdown = (innerContent: string): string => {
  return innerContent.trim();
};

// ===== QuestionParser =====

/**
 * Parse question tag content into structured question data.
 * Supports both legacy (options array) and new (questions array with <q> elements) formats.
 */
export const parseQuestion = (
  innerContent: string,
): {
  options: string[];
  title?: string;
  optional?: boolean;
  questions?: Question[];
} => {
  const options: string[] = [];
  let title: string | undefined = undefined;
  const questions: Question[] = [];

  // Extract title if present (legacy)
  const titleMatch = new RegExp('<question_title>([\\s\\S]*?)<' + '/question_title>', 'i').exec(
    innerContent,
  );
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Try to parse new schema with <q> elements
  let hasNewSchema = false;
  const content = innerContent || '';

  // Find all <q> tags
  let searchIndex = 0;
  while (searchIndex < content.length) {
    const qStart = content.indexOf('<q ', searchIndex);
    if (qStart === -1) break;

    let tagEnd = -1;
    let isSelfClosing = false;
    let i = qStart + 2;
    while (i < content.length) {
      if (content[i] === '<' && content[i + 1] === '/') break;
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
    const doubleQuoteMatch = openTag.match(/label="([^"]*)"/);
    const singleQuoteMatch = openTag.match(/label='([^']*)'/);

    if (!idMatch || !typeMatch) {
      searchIndex = tagEnd + 1;
      continue;
    }

    hasNewSchema = true;
    const qId = idMatch[1].trim();
    const qType = typeMatch[1].trim() as QuestionType;

    // Extract and decode HTML entities in label
    let qLabel = doubleQuoteMatch
      ? doubleQuoteMatch[1].trim()
      : singleQuoteMatch
        ? singleQuoteMatch[1].trim()
        : `Question ${questions.length + 1}`;
    if (qLabel && qLabel !== `Question ${questions.length + 1}`) {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = qLabel;
      qLabel = textarea.value;
    }

    let qInner = '';
    let closeTagEnd = tagEnd;

    if (!isSelfClosing) {
      const closeIndex = content.indexOf('<' + '/q>', tagEnd + 1);
      if (closeIndex !== -1) {
        qInner = content.substring(tagEnd + 1, closeIndex);
        closeTagEnd = closeIndex + 4;
      }
    } else {
      closeTagEnd = tagEnd + 1;
    }

    const qOptions: string[] = [];
    if (qInner.trim()) {
      const optionRegex = new RegExp('<option>([\\s\\S]*?)<' + '/option>', 'gi');
      let optMatch;
      while ((optMatch = optionRegex.exec(qInner)) !== null) {
        if (optMatch[1].trim()) {
          qOptions.push(optMatch[1].trim());
        }
      }
    }

    // For single/multi, ensure at least 2 options
    if (qType === 'single' || qType === 'multi') {
      if (qOptions.length < 2) {
        searchIndex = closeTagEnd;
        continue;
      }
    }

    questions.push({
      id: qId,
      type: qType,
      label: qLabel,
      options: qOptions.length > 0 ? qOptions : undefined,
    });

    searchIndex = closeTagEnd;
  }

  // If no new schema found, fall back to legacy parsing
  if (!hasNewSchema) {
    const optionRegex = new RegExp('<option>([\\s\\S]*?)<' + '/option>', 'gi');
    let optMatch;
    while ((optMatch = optionRegex.exec(innerContent)) !== null) {
      if (optMatch[1].trim()) {
        options.push(optMatch[1].trim());
      }
    }
  }

  const openTag = innerContent.match(/<question[^>]*>/)?.[0] || '';
  const optional = /optional=["']true["']/i.test(openTag);

  return {
    options: options.length > 0 ? options : [],
    title,
    optional,
    ...(questions.length > 0 ? { questions } : {}),
  };
};

// ===== ThinkingParser =====

/**
 * Thinking content is extracted from the tag content.
 * The thinking blocks are pre-extracted by extractThinkingBlocks
 * and replaced with placeholders. This parser handles the placeholders.
 */
export const parseThinking = (innerContent: string): string => {
  return innerContent.trim();
};

export interface ThinkingExtractResult {
  remainingContent: string;
  thinkingBlocks: string[];
}

/**
 * Pre-extract all <thinking> blocks from content before any tool scanning,
 * so that tool tags inside a thinking block are never mistaken for real calls.
 *
 * CRITICAL FIX: Only extract TOP-LEVEL <thinking> blocks (not nested inside tool tags).
 * This prevents false-positives when <thinking> appears as literal text inside
 * tool content (e.g., inside <content> of <write_to_file>).
 *
 * ADDITIONAL FIX: Skip <thinking> tags inside backticks (inline code or code blocks).
 *
 * Closed blocks are replaced with numbered placeholders __THINKING_N__ and
 * their content stored in thinkingBlocks[].
 *
 * NOTE: Since we no longer parse during streaming, unclosed thinking blocks
 * should not occur. All content is complete when this function is called.
 */
export const extractThinkingBlocks = (content: string): ThinkingExtractResult => {
  const thinkingBlocks: string[] = [];
  const CLOSE_THINKING = '<' + '/thinking>';

  // Tool tags that should NOT have their content scanned for thinking blocks
  // Use EXECUTABLE tools only (excludes UI category: markdown, question, code, thinking)
  // These are real tool calls that might contain literal <thinking> in their content
  const toolTags = [
    ...getAllToolTypes().filter((t: string) => t !== 'thinking'),
    'file', // Special display tag not in registry
  ];

  // Build processed content manually by scanning through
  let processed = '';
  let i = 0;
  let inBacktick = false; // Track if we're inside backticks
  let backtickCount = 0; // Track single (`) vs triple (```) backticks

  while (i < content.length) {
    // Check for backticks (both single ` and triple ```)
    if (content[i] === '`') {
      // Count consecutive backticks
      let currentBacktickCount = 0;
      let j = i;
      while (j < content.length && content[j] === '`') {
        currentBacktickCount++;
        j++;
      }

      // Toggle backtick state if matching pair
      if (inBacktick && currentBacktickCount === backtickCount) {
        // Closing backtick
        inBacktick = false;
        backtickCount = 0;
      } else if (!inBacktick) {
        // Opening backtick
        inBacktick = true;
        backtickCount = currentBacktickCount;
      }

      // Copy backticks to output
      processed += content.substring(i, j);
      i = j;
      continue;
    }

    // Skip thinking/tool parsing if inside backticks
    if (inBacktick) {
      processed += content[i];
      i++;
      continue;
    }

    // Check if we're at the start of a tool tag
    let foundToolTag = false;
    for (const toolTag of toolTags) {
      const openTag = '<' + toolTag;
      if (content.substring(i, i + openTag.length).toLowerCase() === openTag.toLowerCase()) {
        // Must be followed by > or space or / (not part of a longer tag name)
        const nextChar = content[i + openTag.length];
        if (nextChar !== '>' && nextChar !== ' ' && nextChar !== '/') {
          // This is part of a longer tag name (e.g., <thinking> vs <think>), skip
          continue;
        }

        // Find the closing tag for this tool
        const closingTag = '<' + '/' + toolTag + '>';
        const closingIndex = content.toLowerCase().indexOf(closingTag.toLowerCase(), i);

        if (closingIndex !== -1) {
          // Copy entire tool block as-is (including any nested <thinking> as literal text)
          const toolBlock = content.substring(i, closingIndex + closingTag.length);
          processed += toolBlock;
          i = closingIndex + closingTag.length;
          foundToolTag = true;
          break;
        } else {
          // Tool tag not closed - copy remaining content as-is
          processed += content.substring(i);
          i = content.length;
          foundToolTag = true;
          break;
        }
      }
    }

    if (foundToolTag) {
      continue;
    }

    // Check for <thinking> tag at current position (only at top-level)
    const thinkingOpenTag = '<thinking>';

    if (
      content.substring(i, i + thinkingOpenTag.length).toLowerCase() ===
      thinkingOpenTag.toLowerCase()
    ) {
      let thinkingEndIndex = findClosingTagPosition(
        content,
        i + thinkingOpenTag.length,
        CLOSE_THINKING,
      );

      // Fallback: if backtick-aware search failed but closing tag exists, use simple search
      if (thinkingEndIndex === -1) {
        const simpleEndIndex = content
          .toLowerCase()
          .indexOf(CLOSE_THINKING.toLowerCase(), i + thinkingOpenTag.length);
        if (simpleEndIndex !== -1) {
          thinkingEndIndex = simpleEndIndex;
        }
      }

      if (thinkingEndIndex !== -1) {
        // Found complete thinking block
        const thinkingContent = content.substring(i + thinkingOpenTag.length, thinkingEndIndex);
        const idx = thinkingBlocks.length;
        thinkingBlocks.push(thinkingContent);
        processed += `__THINKING_${idx}__`;
        i = thinkingEndIndex + CLOSE_THINKING.length;

        continue;
      } else {
        processed += content.substring(i);
        i = content.length;
        break;
      }
    }

    // Regular character, just copy it
    processed += content[i];
    i++;
  }

  return {
    remainingContent: processed,
    thinkingBlocks,
  };
};
