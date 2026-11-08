/**
 * JSON Tool Format
 * AI uses JSON fenced blocks for tool calls: ```json { tool, params } ```
 */

import { getAllToolTypes } from '../../constants/tag-registry';
import { getModuleParser } from '../moduleRegistry';
import { parserThinking } from '../parsers/ThinkingParser';
import { parseConversationTitle } from '../parsers/ConversationTitleParser';

import type { ToolFormatDefinition } from './types';
import type { ParsedResponse, ToolAction } from '../responseParser';
import type { ContentBlock } from '../../types/renderer-types';
import type { Question, QuestionType } from '../../types/message';

const paramsToXmlInner = (params: Record<string, any>): string => {
  return Object.entries(params)
    .map(([key, val]) => {
      if (val === null || val === undefined) return '';
      return `<${key}>${String(val)}</${key}>`;
    })
    .join('');
};

const callToJson = ({ tool, params }: { tool: string; params: Record<string, any> }): string =>
  '```json\n' + JSON.stringify({ tool, params }) + '\n```';

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

const BARE_JSON_START = /^\{\s*"(?:tool|type)"\s*:/;

const findBalancedObjectEnd = (text: string, start: number): number => {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
};

export const wrapBareJsonObjects = (content: string): string => {
  if (!/\{\s*"(?:tool|type)"\s*:/.test(content)) return content;
  return content
    .split(/(```[\s\S]*?```)/g)
    .map((part, idx) => {
      if (idx % 2 === 1) return part;
      const unclosedAt = part.indexOf('```');
      const head = unclosedAt === -1 ? part : part.slice(0, unclosedAt);
      const tail = unclosedAt === -1 ? '' : part.slice(unclosedAt);
      let out = '';
      let i = 0;
      while (i < head.length) {
        if (head[i] === '{' && head[i - 1] !== '`' && BARE_JSON_START.test(head.slice(i, i + 64))) {
          const end = findBalancedObjectEnd(head, i);
          if (end !== -1) {
            const candidate = head.slice(i, end + 1);
            try {
              JSON.parse(candidate);
              out += '\n```json\n' + candidate + '\n```\n';
              i = end + 1;
              continue;
            } catch {
              void 0;
            }
          }
        }
        out += head[i];
        i++;
      }
      return out + tail;
    })
    .join('');
};

const parseJson = (
  content: string,
  result: ParsedResponse,
  _feature?: string | null,
): ParsedResponse => {
  const { remainingContent: scanStr, thinkingBlocks } = parserThinking(content);

  let lastIndex = 0;

  const pushMarkdown = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    result.contentBlocks.push({ type: 'markdown', content: trimmed });
  };

  const pushJsonCode = (body: string) => {
    const m = /^\{\s*"type"\s*:\s*"markdown"\s*,\s*"content"\s*:\s*"([\s\S]*?)"?\s*\}?\s*$/.exec(body.trim());
    if (m) {
      let text = m[1];
      try {
        text = JSON.parse('"' + text + '"');
      } catch {
        text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
      pushMarkdown(text);
      return;
    }
    pushMarkdown(body);
  };

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
      const uiType = parsed.type as string;

      if (uiType !== 'markdown' && uiType !== 'question' && getAllToolTypes().includes(uiType)) {
        const action = jsonToolToAction(uiType, parsed.params || {}, rawJson);
        if (action) {
          result.contentBlocks.push({
            type: 'tool',
            action,
            actionIndex: result.actions.length,
          });
          result.actions.push(action);
          continue;
        }
      }

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

  const tail = scanStr.slice(lastIndex);
  const unclosedFenceAt = tail.indexOf('```json');
  if (unclosedFenceAt !== -1) {
    pushMarkdown(tail.slice(0, unclosedFenceAt));
    pushJsonCode(tail.slice(unclosedFenceAt + 7).replace(/^\s*\n/, '').replace(/```\s*$/, ''));
  } else {
    pushMarkdown(tail);
  }

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

export const jsonFormat: ToolFormatDefinition = {
  id: 'json',
  label: 'JSON',
  description: 'AI uses JSON fenced blocks for tool calls',
  colorVar: '--blue',
  normalize: wrapBareJsonObjects,
  serializeCall: callToJson,
  parse: parseJson,
};
