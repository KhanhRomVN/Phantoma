import { findClosingTagPosition } from '../../utils/TagClosingFinder';
import { getAllToolTypes } from '../../constants/constants';

export interface ThinkingExtractResult {
  remainingContent: string;
  thinkingBlocks: string[];
}

/**
 * Pre-extract all thinking blocks from content.
 */
function extractThinkingBlocks(content: string): ThinkingExtractResult {
  const thinkingOpenTag = '';
  let i = 0;
  let processed = '';
  const thinkingBlocks: string[] = [];

  while (i < content.length) {
    // Check for opening tag
    if (content.substring(i, i + thinkingOpenTag.length).toLowerCase() === thinkingOpenTag) {
      // Find closing tag using backtick-aware search
      let thinkingEndIndex = findClosingTagPosition(
        content,
        i + thinkingOpenTag.length,
        thinkingCloseTag,
      );

      // Fallback: if backtick-aware search failed but </thinking> exists, use simple search
      if (thinkingEndIndex === -1) {
        const simpleEndIndex = content
          .toLowerCase()
          .indexOf('</thinking>', i + thinkingOpenTag.length);
        if (simpleEndIndex !== -1) {
          thinkingEndIndex = simpleEndIndex;
        }
      }

      if (thinkingEndIndex !== -1) {
        // Found complete thinking block
        let thinkingContent = content.substring(
          i + thinkingOpenTag.length,
          thinkingEndIndex,
        );
        
        // Check if there's a <thinking_elapsed> tag right after </thinking>
        let endPos = thinkingEndIndex + '</thinking>'.length;
        const elapsedTagPattern = /^\s*<thinking_elapsed>([\d.]+)<\/thinking_elapsed>/i;
        const remainingContent = content.substring(endPos);
        const elapsedMatch = remainingContent.match(elapsedTagPattern);
        
        if (elapsedMatch) {
          // Include the elapsed tag in the thinking content
          thinkingContent += `\n<thinking_elapsed>${elapsedMatch[1]}</thinking_elapsed>`;
          endPos += elapsedMatch[0].length;
        }
        
        const idx = thinkingBlocks.length;
        thinkingBlocks.push(thinkingContent);
        processed += `__THINKING_${idx}__`;
        i = endPos;

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