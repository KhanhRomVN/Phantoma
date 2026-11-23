/**
 * ------------------------------------------------------------------
 * Thinking Parser
 * ------------------------------------------------------------------
 * Parse thinking blocks.
 *
 * Main functions:
 * - parserThinking() : Pre-extract thinking blocks từ content
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { findClosingTagPosition } from '../../utils/tagClosingFinder';

// ── Constants ──
import { getAllToolTypes } from '../../constants/tag-registry';

// ─── Types ──────────────────────────────────────────────────────────────
export interface ThinkingExtractResult {
  remainingContent: string;
  thinkingBlocks: string[];
}

// ─── Functions ──────────────────────────────────────────────────────────
export const parserThinking = (content: string): ThinkingExtractResult => {
  const thinkingBlocks: string[] = [];
  const CLOSE_THINKING = '<' + '/thinking>';

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
