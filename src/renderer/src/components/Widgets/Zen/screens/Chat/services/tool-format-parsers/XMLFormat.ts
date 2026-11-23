/**
 * XML Tool Format
 * AI uses XML tags for tool calls: <tool_name>...</tool_name>
 */

import { getAllToolTypes } from '../../constants/tag-registry';
import { getModuleParser } from '../moduleRegistry';
import { findClosingTagPosition } from '../../utils/tagClosingFinder';
import { parseToolAction } from '../../utils/toolParser';
import { parseMarkdown } from '../parsers/MarkdownParser';
import { parserThinking } from '../parsers/ThinkingParser';
import { parseConversationTitle } from '../parsers/ConversationTitleParser';
import { parseQuestion } from '../parsers/QuestionParser';

import type { ToolCallSpec, ToolFormatDefinition } from './types';
import type { ParsedResponse, ToolAction } from '../responseParser';
import type { ContentBlock } from '../../types/renderer-types';

const DEBUG_PARSER =
  typeof window !== 'undefined' && window.localStorage?.getItem('zen_debug_parser') === 'true';

const stringifyParam = (v: unknown): string => (typeof v === 'string' ? v : JSON.stringify(v));

export const callToXml = ({ tool, params }: ToolCallSpec): string => {
  // conversation_title: special case (single string parameter)
  if (tool === 'conversation_title') {
    return `<conversation_title>${stringifyParam(params.title ?? '')}</conversation_title>`;
  }
  // Default: wrap each param in its own tag
  const inner = Object.entries(params)
    .map(([k, v]) => `<${k}>${stringifyParam(v)}</${k}>`)
    .join('');
  return `<${tool}>${inner}</${tool}>`;
};

/**
 * XML format parser: scans for XML tags like <tool_name>...</tool_name>.
 * Text between tags is treated as markdown.
 */
const parseXml = (
  content: string,
  result: ParsedResponse,
  _feature?: string | null,
): ParsedResponse => {
  const parsingSequence: { index: number; tag: string; subTags?: string[] }[] = [];
  let sequenceCounter = 0;

  let remainingContent = content;

  // Hide </no_response> markers
  remainingContent = remainingContent.replace(/<\/no_response\s*>/gi, '');

  // Pre-extract <thinking> blocks BEFORE any tool scanning
  const { remainingContent: contentAfterThinking, thinkingBlocks } =
    parserThinking(remainingContent);

  remainingContent = contentAfterThinking;

  const isLikelyStreaming =
    remainingContent.trim().length === 0 &&
    content.trim().length > 0 &&
    content.trim().length < 2000 &&
    !content.includes('</thinking>');

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

  const toolPatterns = [
    ...getAllToolTypes().filter((t) => t !== 'thinking'),
    'file',
    'code',
  ];

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

    for (const toolName of toolPatterns) {
      const openRegex = new RegExp(`<${toolName}(?:\\s+[^>]*|\\s*/)?>`, 'i');
      const openMatch = openRegex.exec(str);

      if (!openMatch) continue;

      const openIndex = openMatch.index;
      const openTagFull = openMatch[0];
      const startContentPos = openIndex + openTagFull.length;

      if (openTagFull.trim().endsWith('/>')) {
        if (minIndex === -1 || openIndex < minIndex) {
          minIndex = openIndex;
          bestMatch = [openTagFull, ''];
          bestTool = toolName;
          isClosed = true;
        }
        continue;
      }

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

    for (const segment of segments) {
      result.contentBlocks.push(segment);
    }
  };

  let scanStr = remainingContent;

  while (scanStr.length > 0) {
    const { index, match, toolName, isClosed } = findNextTag(scanStr);

    if (index !== -1 && match) {
      const prefix = scanStr.substring(0, index);
      if (prefix.trim()) {
        pushTextOrCodeBlocks('markdown', prefix);
      }

      const rawXml = match[0];

      if (isClosed) {
        const innerContent = match[1];

        const extractSubTags = (content: string): string[] => {
          const subTagRegex = /<([a-zA-Z_][a-zA-Z0-9_]*?)(?:\s+[^>]*)?>[\s\S]*?<\/\1>/g;
          const selfClosingRegex = /<([a-zA-Z_][a-zA-Z0-9_]*?)(?:\s+[^>]*)?\/>>/g;
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
          const raw = innerContent || '';
          const questionMatch = /<question(?:\s+[^>]*)?'>([\s\S]*?)<\/question>/i.exec(raw);
          if (questionMatch) {
            const preText = raw.substring(0, questionMatch.index);
            const questionRaw = questionMatch[0];
            const postText = raw.substring(questionMatch.index + questionRaw.length);

            if (preText.trim().length > 0) {
              pushTextOrCodeBlocks('markdown', parseMarkdown(preText));
            }

            const parsedQ = parseQuestion(questionMatch[1]);
            if (parsedQ.options.length > 0 || (parsedQ.questions && parsedQ.questions.length > 0)) {
              const qBlock: ContentBlock = {
                type: 'question',
                options: parsedQ.options,
                title: parsedQ.title,
                optional: parsedQ.optional,
                ...(parsedQ.questions && parsedQ.questions.length > 0
                  ? { questions: parsedQ.questions }
                  : {}),
              };
              result.contentBlocks.push(qBlock);
              result.question = qBlock;
            }

            if (postText.trim().length > 0) {
              pushTextOrCodeBlocks('markdown', parseMarkdown(postText));
            }
          } else {
            const content = parseMarkdown(raw);
            if (content && content.trim().length > 0) {
              pushTextOrCodeBlocks('markdown', content);
            }
          }
        } else if (toolName === 'question') {
          const parsed = parseQuestion(innerContent || '');

          const openTag = match[0].split('>')[0];
          const optional = /optional=["']true["']/i.test(openTag);

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
          const actionIndex = result.actions.length;
          let action: ToolAction;
          const effectiveTool = toolName;

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

              default:
                action = parseToolAction(toolName, innerContent || '', rawXml);
            }

          result.contentBlocks.push({ type: 'tool', action, actionIndex });
          result.actions.push(action);

          if (DEBUG_PARSER) {
          }
        }

        scanStr = scanStr.substring(index + rawXml.length);
      } else {
        if (scanStr.trim()) {
          pushTextOrCodeBlocks('markdown', scanStr);
        }
        break;
      }
    } else {
      const partialTagMatch = /<[\/]?[a-zA-Z0-9_]*$/.exec(scanStr);
      if (partialTagMatch) {
        const textBeforePartial = scanStr.substring(0, partialTagMatch.index);
        if (textBeforePartial.trim()) {
          pushTextOrCodeBlocks('markdown', textBeforePartial);
        }
      } else {
        if (scanStr.trim()) {
          pushTextOrCodeBlocks('markdown', scanStr);
        }
      }
      break;
    }
  }

  result.displayText = result.contentBlocks
    .filter((b: any) => b.type === 'markdown')
    .map((b: any) => (b as any).content)
    .join('\n\n');

  const placeholderRegex = /__THINKING_(\d+)__/g;

  const expandedBlocks: ContentBlock[] = [];
  for (const block of result.contentBlocks) {
    if (block.type === 'markdown' && placeholderRegex.test(block.content)) {
      placeholderRegex.lastIndex = 0;
      const parts = block.content.split(/__THINKING_(\d+)__/);
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          if (parts[i].trim()) {
            expandedBlocks.push({ type: 'markdown', content: parts[i] });
          }
        } else {
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

  result.contentBlocks = expandedBlocks;

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

  const hasThinkingBlocks = thinkingBlocks.length > 0;
  const nonThinkingBlocks = result.contentBlocks.filter(
    (block: ContentBlock) => block.type !== 'thinking',
  );
  const hasOtherContent = nonThinkingBlocks.length > 0 || result.actions.length > 0;

  if (hasThinkingBlocks && !hasOtherContent && content.trim().length > 100) {
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
    const errorActions = result.actions.filter((a: ToolAction) => a.isError);

    if (errorActions.length > 0) {
      console.warn(
        '[Zen][Parser] ⚠️ Error actions summary:',
        errorActions.map((a: ToolAction) => ({
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

export const xmlFormat: ToolFormatDefinition = {
  id: 'xml',
  label: 'XML',
  description: 'AI uses XML tags for tool calls',
  colorVar: '--warn',
  serializeCall: callToXml,
  parse: parseXml,
};
