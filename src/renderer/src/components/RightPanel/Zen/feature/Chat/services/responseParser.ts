/**
 * ------------------------------------------------------------------
 * Response Parser
 * ------------------------------------------------------------------
 * Parse AI response để extract tool actions và content blocks.
 * Hỗ trợ interleaved text và tool calls trong cùng response.
 * Delegates to format-specific parsers (XML, JSON, DSML) in tool-formats/
 *
 * Main exports:
 * - ParsedResponse : Cấu trúc kết quả parse
 * - ToolAction     : Action của một tool call
 * - parseAIResponse() : Parse AI response thành structured data
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
import { TagType } from '../types/tag-types';
import type { ContentBlock } from '../types/renderer-types';
import { getToolFormat, DEFAULT_TOOL_FORMAT, FALLBACK_PARSER_FORMAT } from './tool-formats';
import type { ToolFormatId } from './tool-formats/types';

// ─── Types ──────────────────────────────────────────────────────────────
export interface ParsedResponse {
  followupQuestion: string | null;
  followupOptions: string[] | null;
  taskName: string | null;
  actions: ToolAction[];
  contentBlocks: ContentBlock[];
  displayText: string;
  question: ContentBlock | null;
  onlyThinkingDetected?: boolean;
}

export interface ToolAction {
  type: TagType;
  params: Record<string, any>;
  rawXml: string;
  isError?: boolean;
  errorMessage?: string;
  errorCode?: string;
}

/**
 * Parse AI response to extract tool actions.
 * Delegates to format-specific parsers registered in tool-formats/
 */
export const parseAIResponse = (
  content: string,
  toolFormat: ToolFormatId = DEFAULT_TOOL_FORMAT,
  feature?: string | null,
): ParsedResponse => {
  const result: ParsedResponse = {
    followupQuestion: null,
    followupOptions: null,
    taskName: null,
    actions: [],
    contentBlocks: [],
    displayText: '',
    question: null,
  };

  const format = getToolFormat(toolFormat);

  let normalizedContent = content;
  if (format.normalize) {
    normalizedContent = format.normalize(content);
  }

  // Delegate to format-specific parser
  if (format.parse) {
    const parsed = format.parse(normalizedContent, result, feature);
    return parsed ?? result;
  }

  // Fallback: if format has no parser, use fallback parser format (most backward-compatible)
  console.warn(
    `[Parser] No parser for format: ${toolFormat}, falling back to ${FALLBACK_PARSER_FORMAT}`,
  );
  const fallbackFormat = getToolFormat(FALLBACK_PARSER_FORMAT);
  if (fallbackFormat.parse) {
    const parsed = fallbackFormat.parse(normalizedContent, result, feature);
    return parsed ?? result;
  }

  return result;
};


