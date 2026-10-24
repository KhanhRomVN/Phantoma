/**
 * ------------------------------------------------------------------
 * Response Parser
 * ------------------------------------------------------------------
 * Parse AI response để extract tool actions và content blocks.
 * Hỗ trợ interleaved text và tool calls trong cùng response.
 * Hỗ trợ cả XML tags (default) và JSON fenced blocks.
 *
 * Main exports:
 * - ParsedResponse : Cấu trúc kết quả parse
 * - ToolAction     : Action của một tool call
 * - parseAIResponse() : Parse AI response thành structured data
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── Constants ──
import { getAllToolTypes } from '../constants/tag-registry';
// ── Types ──
import { TagType } from '../types/tag-types';
import { getModuleParser } from './ModuleRegistry';
import type { ContentBlock } from '../types/renderer-types';
import type { Question, QuestionType } from '../types/message';

// ── Utils ─
import { findClosingTagPosition } from '../utils/TagClosingFinder';
import { parseToolAction } from '../utils/ToolParser';

// ── Parsers ──
import { parseMarkdown } from './parsers/MarkdownParser';
import { parserThinking } from './parsers/ThinkingParser';
import { parseConversationTitle } from './parsers/ConversationTitleParser';

import { parseQuestion } from './parsers/QuestionParser';

export const DESIGN_TOOL_NAMES = new Set([
  'read_file',
  'create_file',
  'update_file',
  'list_files',
  'grep',
]);

/**
 * Parse a raw inner-content string from JSON params into the same shape
 * that XML parsers expect by converting the params object to pseudo-XML.
 * e.g. { file_path: "foo.ts", start_line: 1 } → "<file_path>foo.ts</file_path><start_line>1</start_line>"
 */
const paramsToXmlInner = (params: Record<string, any>): string => {
  return Object.entries(params)
    .map(([key, val]) => {
      if (val === null || val === undefined) return '';
      return `<${key}>${String(val)}</${key}>`;
    })
    .join('');
};

/**
 * Convert a JSON tool object to a ToolAction using the existing XML parsers.
 */
const jsonToolToAction = (
  toolName: string,
  params: Record<string, any>,
  rawJson: string,
): ToolAction | null => {
  const inner = paramsToXmlInner(params);
  const moduleParse = getModuleParser(toolName);
  if (moduleParse) {
    return { type: toolName as any, params: moduleParse(inner), rawXml: rawJson };
  }
  switch (toolName) {
    case 'commit_message':
      return { type: 'commit_message', params: {}, rawXml: rawJson };
    case 'conversation_title':
      return {
        type: 'conversation_title',
        params: parseConversationTitle(String(params.title ?? '')),
        rawXml: rawJson,
      };

    default:
      return null;
  }
};

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
 * Parse AI response to extract tool actions
 * Supports interleaved text and tool calls
 */
// Enable debug logs via localStorage
const DEBUG_PARSER =
  typeof window !== 'undefined' && window.localStorage?.getItem('zen_debug_parser') === 'true';

/**
 * JSON format parser: scans response for ```json {...} ``` fenced blocks that match
 * { tool, params } (tool call) or { type, ... } (markdown / code / question UI object).
 * Text between blocks is treated as markdown.
 */
const parseAIResponseJson = (content: string, result: ParsedResponse): ParsedResponse => {
  const { remainingContent: scanStr, thinkingBlocks } = parserThinking(content);

  let lastIndex = 0;

  const pushMarkdown = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    result.contentBlocks.push({ type: 'markdown', content: trimmed });
  };

  const pushJsonCode = (body: string) => {
    result.contentBlocks.push({ type: 'code', content: body, language: 'json' });
  };

  /**
   * Balanced-fence scanner: ignores triple backticks that appear inside JSON string values
   * by tracking in-string state (unescaped double quote toggles it).
   */
  const findNextJsonFence = (
    fromIdx: number,
  ): { openStart: number; bodyStart: number; bodyEnd: number; fenceEnd: number } | null => {
    const OPEN = '```json';
    const openIdx = scanStr.indexOf(OPEN, fromIdx);
    if (openIdx === -1) return null;

    const nlAfterOpen = scanStr.indexOf('\n', openIdx);
    const bodyStart = nlAfterOpen !== -1 ? nlAfterOpen + 1 : openIdx + OPEN.length;

    let inString = false;
    let escape = false;
    for (let i = bodyStart; i < scanStr.length; i++) {
      const ch = scanStr[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString && ch === '`' && scanStr.startsWith('```', i)) {
        return { openStart: openIdx, bodyStart, bodyEnd: i, fenceEnd: i + 3 };
      }
    }
    return null;
  };

  const GIT_STATUS_OPEN = '<git_status>';
  const GIT_STATUS_CLOSE = '</git_status>';

  while (lastIndex < scanStr.length) {
    const fence = findNextJsonFence(lastIndex);
    const gsOpen = scanStr.indexOf(GIT_STATUS_OPEN, lastIndex);
    const gsClose =
      gsOpen !== -1 ? scanStr.indexOf(GIT_STATUS_CLOSE, gsOpen + GIT_STATUS_OPEN.length) : -1;
    const hasValidGs = gsOpen !== -1 && gsClose !== -1;

    if (!fence && !hasValidGs) break;

    if (hasValidGs && (!fence || gsOpen < fence.openStart)) {
      pushMarkdown(scanStr.slice(lastIndex, gsOpen));

      const inner = scanStr.slice(gsOpen + GIT_STATUS_OPEN.length, gsClose);
      const rawXml = scanStr.slice(gsOpen, gsClose + GIT_STATUS_CLOSE.length);
      const gitAction: ToolAction = {
        type: 'git_status',
        params: getModuleParser('git_status')!(inner),
        rawXml,
      };
      result.contentBlocks.push({
        type: 'tool',
        action: gitAction,
        actionIndex: result.actions.length,
      });
      result.actions.push(gitAction);
      lastIndex = gsClose + GIT_STATUS_CLOSE.length;
      continue;
    }

    if (!fence) break;

    pushMarkdown(scanStr.slice(lastIndex, fence.openStart));

    const rawJson = scanStr.slice(fence.openStart, fence.fenceEnd);
    const jsonBody = scanStr.slice(fence.bodyStart, fence.bodyEnd).trim();
    lastIndex = fence.fenceEnd;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonBody);
    } catch {
      pushJsonCode(jsonBody);
      continue;
    }

    if (typeof parsed?.type === 'string' && typeof parsed?.tool === 'undefined') {
      if (parsed.type === 'markdown' && typeof parsed.content === 'string') {
        pushMarkdown(parsed.content);
      } else if (parsed.type === 'code' && typeof parsed.content === 'string') {
        const codeContent = parsed.content.trim();
        const language = typeof parsed.language === 'string' ? parsed.language : 'text';
        if (codeContent.length > 0) {
          result.contentBlocks.push({ type: 'code', content: codeContent, language });
        }
      } else if (parsed.type === 'question' && Array.isArray(parsed.questions)) {
        const questions: Question[] = [];
        for (const q of parsed.questions) {
          if (
            !q ||
            typeof q.id !== 'string' ||
            typeof q.type !== 'string' ||
            typeof q.label !== 'string'
          ) {
            continue;
          }
          const qType = q.type as QuestionType;
          const options: string[] = Array.isArray(q.options)
            ? q.options.filter((o: unknown) => typeof o === 'string')
            : [];
          if ((qType === 'single' || qType === 'multi') && options.length < 2) continue;
          questions.push({
            id: q.id,
            type: qType,
            label: q.label,
            options: options.length > 0 ? options : undefined,
          });
        }
        if (questions.length > 0) {
          const questionBlock: ContentBlock = { type: 'question', options: [], questions };
          result.contentBlocks.push(questionBlock);
          result.question = questionBlock;
        }
      } else {
        pushJsonCode(jsonBody);
      }
      continue;
    }

    if (
      typeof parsed?.tool !== 'string' ||
      typeof parsed?.params !== 'object' ||
      parsed.params === null
    ) {
      pushJsonCode(jsonBody);
      continue;
    }

    const action = jsonToolToAction(parsed.tool, parsed.params, rawJson);
    if (!action) {
      pushJsonCode(jsonBody);
      continue;
    }

    result.contentBlocks.push({ type: 'tool', action, actionIndex: result.actions.length });
    result.actions.push(action);
  }

  pushMarkdown(scanStr.slice(lastIndex));

  const placeholderRegex = /__THINKING_(\d+)__/g;
  const expandedBlocks: ContentBlock[] = [];
  for (const block of result.contentBlocks) {
    if (block.type === 'markdown' && placeholderRegex.test(block.content)) {
      placeholderRegex.lastIndex = 0;
      const parts = block.content.split(/__THINKING_(\d+)__/);
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          if (parts[i].trim()) expandedBlocks.push({ type: 'markdown', content: parts[i] });
        } else {
          const thinkingIdx = parseInt(parts[i], 10);
          expandedBlocks.push({ type: 'thinking', content: thinkingBlocks[thinkingIdx] ?? '' });
        }
      }
    } else {
      expandedBlocks.push(block);
    }
  }
  result.contentBlocks = expandedBlocks;

  result.displayText = result.contentBlocks
    .filter((b: any) => b.type === 'markdown')
    .map((b: any) => b.content)
    .join('\n\n');

  return result;
};

export const parseAIResponse = (
  content: string,
  toolFormat: 'xml' | 'json' = 'xml',
  feature?: string | null,
): ParsedResponse => {
  // Track parsing sequence for debugging
  const parsingSequence: { index: number; tag: string; subTags?: string[] }[] = [];
  let sequenceCounter = 0;

  const result: ParsedResponse = {
    followupQuestion: null,
    followupOptions: null,
    taskName: null,
    actions: [],
    contentBlocks: [],
    displayText: '',
    question: null,
  };

  // ─── JSON format path with auto-detect fallback ──────────────────────────
  if (toolFormat === 'json') {
    const hasJsonFence = /```json[\s\S]*?```/.test(content);
    const hasXmlTags =
      /<(conversation_title|markdown|followup_question|attempt_completion|use_tool|think)[^>]*>/i.test(
        content,
      );

    if (!hasJsonFence && hasXmlTags) {
    } else {
      return parseAIResponseJson(content, result);
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  let remainingContent = content;

  // Hide </no_response> markers
  remainingContent = remainingContent.replace(/<\/no_response\s*>/gi, '');

  // Pre-extract <thinking> blocks BEFORE any tool scanning so that tool tags
  // inside a thinking block are never mistaken for real tool calls.
  const { remainingContent: contentAfterThinking, thinkingBlocks } =
    parserThinking(remainingContent);

  remainingContent = contentAfterThinking;

  // 🔍 ALWAYS log if content is stripped completely
  // BUT skip if this is likely a streaming intermediate state
  const isLikelyStreaming =
    remainingContent.trim().length === 0 &&
    content.trim().length > 0 &&
    content.trim().length < 2000 && // Small content, likely incomplete
    !content.includes('</thinking>'); // No closing tag yet

  if (
    DEBUG_PARSER &&
    remainingContent.trim().length === 0 &&
    content.trim().length > 100 &&
    !isLikelyStreaming
  ) {
    console.warn('[Zen][Parser] ⚠️ All content consumed by thinking extraction!', {
      originalLength: content.length,
      thinkingBlocks: thinkingBlocks.length,
    });
  }

  // Scan for tools and text blocks
  // Note: "thinking" is intentionally excluded — thinking blocks are pre-extracted
  // above and stored in thinkingBlocks[]. Placeholders __THINKING_N__ in markdown
  // text will be restored after the main scan loop.

  // Auto-generated from Tool Registry - includes all tools plus special tags
  const toolPatterns = [
    ...getAllToolTypes().filter((t) => t !== 'thinking'), // Exclude thinking (pre-extracted)
    'file', // Special display tag not in registry
    'markdown', // Special display tag
    'code', // Special display tag
    'question', // Special display tag
  ];

  // Fix missing opening bracket for the first tool call due to prefix/prefill stripping.
  // Use only horizontal whitespace (\t, space) — NOT \n — and no 'i' flag to avoid
  // accidentally eating the first character of normal text.
  const toolNamesPattern = toolPatterns.join('|');
  const missingBracketRegex = new RegExp(`^([ \t]*(?:•[ \t]*)?)(${toolNamesPattern})>`);
  if (missingBracketRegex.test(remainingContent)) {
    remainingContent = remainingContent.replace(missingBracketRegex, '$1<$2>');
  }

  const findNextTag = (str: string) => {
    let minIndex = -1;
    let bestMatch: any = null;
    let bestTool = '';
    let isClosed = false;

    // 1. Try to find complete (closed) tags first using backtick-aware search
    for (const toolName of toolPatterns) {
      // Find opening tag
      const openRegex = new RegExp(`<${toolName}(?:\\s+[^>]*|\\s*/)?>`, 'i');
      const openMatch = openRegex.exec(str);

      if (!openMatch) continue;

      const openIndex = openMatch.index;
      const openTagFull = openMatch[0];
      const startContentPos = openIndex + openTagFull.length;

      // Check if it's self-closing
      if (openTagFull.trim().endsWith('/>')) {
        // Self-closing tag
        if (minIndex === -1 || openIndex < minIndex) {
          minIndex = openIndex;
          bestMatch = [openTagFull, '']; // No inner content
          bestTool = toolName;
          isClosed = true;
        }
        continue;
      }

      // Find closing tag using backtick-aware search
      const closingTagPattern = `</${toolName}>`;
      const closingPos = findClosingTagPosition(str, startContentPos, closingTagPattern);

      if (closingPos !== -1) {
        if (minIndex === -1 || openIndex < minIndex) {
          const innerContent = str.substring(startContentPos, closingPos);
          const fullMatch = str.substring(openIndex, closingPos + closingTagPattern.length);
          minIndex = openIndex;
          bestMatch = [fullMatch, innerContent];
          bestMatch.index = openIndex;
          bestTool = toolName;
          isClosed = true;
        }
      }
    }

    // 2. If no closed tag found, check for unclosed start tags
    if (minIndex === -1) {
      for (const toolName of toolPatterns) {
        const openRegex = new RegExp(`<${toolName}(?:\\s+[^>]*|\\s*/)?>`, 'i');
        const match = openRegex.exec(str);
        if (match) {
          if (minIndex === -1 || match.index < minIndex) {
            minIndex = match.index;
            bestMatch = match;
            bestTool = toolName;
            isClosed = false;
          }
        }
      }
    }

    return { index: minIndex, match: bestMatch, toolName: bestTool, isClosed };
  };

  const pushTextOrCodeBlocks = (baseType: 'markdown', content: string) => {
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    const segments: any[] = [];

    while ((match = regex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        segments.push({ type: baseType, content: textBefore });
      }

      const language = match[1] || 'text';
      const codeContent = match[2].trimEnd();
      // If AI wraps content in ```markdown ... ```, treat it as markdown, not a code block
      // Also treat bare ``` or ```text with no-newline content as markdown
      if (language === 'markdown' || (language === 'text' && !codeContent.includes('\n'))) {
        segments.push({ type: baseType, content: codeContent });
      } else {
        segments.push({
          type: 'code',
          content: codeContent,
          language: language,
        });
      }

      lastIndex = regex.lastIndex;
    }

    const textAfter = content.substring(lastIndex);
    if (textAfter.trim()) {
      segments.push({ type: baseType, content: textAfter });
    }

    // Always push segments as individual blocks instead of mixed_content
    for (const segment of segments) {
      result.contentBlocks.push(segment);
    }
  };

  let scanStr = remainingContent;

  while (scanStr.length > 0) {
    const { index, match, toolName, isClosed } = findNextTag(scanStr);

    if (index !== -1 && match) {
      // 1. Everything before the tag is markdown
      const prefix = scanStr.substring(0, index);
      if (prefix.trim()) {
        pushTextOrCodeBlocks('markdown', prefix);
      }

      // 2. Handle the tag
      const rawXml = match[0];

      if (isClosed) {
        const innerContent = match[1];

        // Extract sub-tags for debugging
        const extractSubTags = (content: string): string[] => {
          const subTagRegex = /<([a-zA-Z_][a-zA-Z0-9_]*?)(?:\s+[^>]*)?>[\s\S]*?<\/\1>/g;
          const selfClosingRegex = /<([a-zA-Z_][a-zA-Z0-9_]*?)(?:\s+[^>]*)?\/>/g;
          const subTags = new Set<string>();

          let match;
          while ((match = subTagRegex.exec(content)) !== null) {
            subTags.add(match[1]);
          }
          while ((match = selfClosingRegex.exec(content)) !== null) {
            subTags.add(match[1]);
          }

          return Array.from(subTags);
        };

        const subTags = extractSubTags(innerContent || '');
        parsingSequence.push({
          index: ++sequenceCounter,
          tag: toolName,
          ...(subTags.length > 0 ? { subTags } : {}),
        });

        if (toolName === 'markdown') {
          // Explicit <markdown> tag - use MarkdownParser
          const content = parseMarkdown(innerContent || '');
          if (content) {
            pushTextOrCodeBlocks('markdown', content);
          }
        } else if (toolName === 'question') {
          // Explicit <question> tag - delegate sang QuestionParser.
          const parsed = parseQuestion(innerContent || '');

          // `optional` phải đọc từ opening tag gốc, không nằm trong innerContent.
          const openTag = match[0].split('>')[0];
          const optional = /optional=["']true["']/i.test(openTag);

          // VALIDATION: Only push question block if it has valid content.
          // Skip empty questions to avoid showing empty outline boxes during streaming.
          const hasValidContent = parsed.options.length > 0 || (parsed.questions?.length ?? 0) > 0;

          if (hasValidContent) {
            const qBlock: ContentBlock = {
              type: 'question',
              options: parsed.options,
              title: parsed.title,
              optional,
              ...(parsed.questions ? { questions: parsed.questions } : {}),
            };

            result.contentBlocks.push(qBlock);
            result.question = qBlock;

            if (parsed.options.length > 0) {
              result.followupOptions = parsed.options;
            }
          }
        } else {
          // It's a tool - delegate to individual tag parsers
          const actionIndex = result.actions.length;
          let action: ToolAction;
          const effectiveTool =
            feature === 'design' && DESIGN_TOOL_NAMES.has(toolName)
              ? `design_${toolName}`
              : toolName;

          const moduleParse = getModuleParser(effectiveTool);
          if (moduleParse) {
            action = {
              type: effectiveTool as any,
              params: moduleParse(innerContent || ''),
              rawXml,
            };
          } else
            switch (effectiveTool) {
              case 'conversation_title': {
                const params = parseConversationTitle(innerContent || '');
                action = { type: 'conversation_title' as const, params, rawXml };
                break;
              }

              // ── Recon tools ──────────────────────────────────────
              default:
                // Fallback to ToolParser for any unhandled tools
                action = parseToolAction(toolName, innerContent || '', rawXml);
            }

          result.contentBlocks.push({ type: 'tool', action, actionIndex });
          result.actions.push(action); // Populate legacy actions array

          if (DEBUG_PARSER) {
          }
        }

        // 3. Advance scanStr
        scanStr = scanStr.substring(index + rawXml.length);
      } else {
        // Treat everything from this point as markdown (will be updated in next chunk)
        if (scanStr.trim()) {
          pushTextOrCodeBlocks('markdown', scanStr);
        }
        break;
      }
    } else {
      // No more tags, but check for partial tag prefix at the very end (e.g., "<tex", "<thinking")
      const partialTagMatch = /<[\/]?[a-zA-Z0-9_]*$/.exec(scanStr);
      if (partialTagMatch) {
        const textBeforePartial = scanStr.substring(0, partialTagMatch.index);
        if (textBeforePartial.trim()) {
          pushTextOrCodeBlocks('markdown', textBeforePartial);
        }
        // Don't show the partial tag itself - it will be completed in next stream chunk
      } else {
        if (scanStr.trim()) {
          pushTextOrCodeBlocks('markdown', scanStr);
        }
      }
      break;
    }
  }

  // Generate legacy displayText for fallback
  result.displayText = result.contentBlocks
    .filter((b: any) => b.type === 'markdown')
    .map((b: any) => (b as any).content)
    .join('\n\n');

  // --- Restore thinking blocks from placeholders ---
  // Walk contentBlocks and expand any markdown block that contains __THINKING_N__ placeholders.
  const placeholderRegex = /__THINKING_(\d+)__/g;

  const expandedBlocks: ContentBlock[] = [];
  for (const block of result.contentBlocks) {
    if (block.type === 'markdown' && placeholderRegex.test(block.content)) {
      // Reset lastIndex after the test() call
      placeholderRegex.lastIndex = 0;
      const parts = block.content.split(/__THINKING_(\d+)__/);
      // split with a capture group alternates: [text, idx, text, idx, ...text]
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          // text segment
          if (parts[i].trim()) {
            expandedBlocks.push({ type: 'markdown', content: parts[i] });
          }
        } else {
          // thinking index
          const thinkingIdx = parseInt(parts[i], 10);
          expandedBlocks.push({
            type: 'thinking',
            content: thinkingBlocks[thinkingIdx] ?? '',
          });
        }
      }
    } else {
      expandedBlocks.push(block);
    }
  }

  // Replace contentBlocks with expanded version
  result.contentBlocks = expandedBlocks;

  // 🔍 Log if contentBlocks is empty (potential bug) - only in debug mode
  const isPartialTag = /^<[\/]?[a-zA-Z0-9_]*$/.test(content.trim());
  if (
    DEBUG_PARSER &&
    result.contentBlocks.length === 0 &&
    content.trim().length > 0 &&
    !isPartialTag
  ) {
    console.warn('[Zen][Parser] ⚠️ No contentBlocks generated!', {
      contentLength: content.length,
      contentPreview: content.substring(0, 200),
      remainingAfterThinking: remainingContent.substring(0, 100),
    });
  }

  // 🛡️ DETECT ONLY-THINKING RESPONSE (fallback mechanism)
  // If response has thinking blocks BUT no other content or tools, mark it
  const hasThinkingBlocks = thinkingBlocks.length > 0;

  // Check if there are non-thinking content blocks or actions
  const nonThinkingBlocks = result.contentBlocks.filter((block) => block.type !== 'thinking');
  const hasOtherContent = nonThinkingBlocks.length > 0 || result.actions.length > 0;

  if (hasThinkingBlocks && !hasOtherContent && content.trim().length > 100) {
    // Only mark if content is substantial (> 100 chars) to avoid false positives
    result.onlyThinkingDetected = true;
    if (DEBUG_PARSER) {
      console.warn('[Zen][Parser] ⚠️ ONLY-THINKING response detected!', {
        thinkingBlocksCount: thinkingBlocks.length,
        contentLength: content.length,
        totalBlocks: result.contentBlocks.length,
        nonThinkingBlocks: nonThinkingBlocks.length,
      });
    }
  }

  if (DEBUG_PARSER) {
    const errorActions = result.actions.filter((a) => a.isError);

    if (errorActions.length > 0) {
      console.warn(
        '[Zen][Parser] ⚠️ Error actions summary:',
        errorActions.map((a) => ({
          type: a.type,
          errorCode: a.errorCode,
          errorMessage:
            a.errorMessage?.substring(0, 100) +
            (a.errorMessage && a.errorMessage.length > 100 ? '...' : ''),
        })),
      );
    }
  }

  return result;
};

/**
 * Format tool action for display
 */
export const formatActionForDisplay = (action: ToolAction): string => {
  switch (action.type) {
    case 'read_file':
      const range =
        action.params.start_line && action.params.end_line
          ? ` (${action.params.start_line}-${action.params.end_line})`
          : '';
      return `read_file: ${action.params.file_path || 'unknown'}${range}`;

    case 'write_to_file':
      return `write_to_file: ${action.params.file_path || 'unknown'}`;

    case 'replace_in_file':
      return `replace_in_file: ${action.params.file_path || 'unknown'}`;

    case 'run_command':
      return `Run: ${action.params.command || ''}`;

    case 'list_files':
      const type = action.params.type ? ` [${action.params.type}]` : '';
      return `list_files: ${action.params.folder_path || 'unknown'}${type}`;

    case 'find_files':
      const fileCount = action.params.file_names?.length || 0;
      return `find_files: ${fileCount} file name${fileCount === 1 ? '' : 's'}`;

    case 'git_status':
      const count = action.params.items?.length || 0;
      return `git_status: ${count} changes`;

    case 'design_read_file':
      return `read_file: ${action.params.file_path || 'unknown'}`;

    case 'design_create_file':
      return `create_file: ${action.params.file_path || 'unknown'}`;

    case 'design_update_file':
      return `update_file: ${action.params.file_path || 'unknown'}`;

    case 'design_list_files':
      return 'list_files';

    case 'design_grep':
      return `grep: ${action.params.search_term || ''}`;

    default:
      return ``;
  }
};
