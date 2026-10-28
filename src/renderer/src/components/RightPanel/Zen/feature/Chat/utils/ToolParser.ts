/**
 * ------------------------------------------------------------------
 * Tool Parser
 * ------------------------------------------------------------------
 * Helper functions để parse XML tags từ AI response.
 * Hỗ trợ extract param values và decode HTML entities.
 *
 * Main exports:
 * - CONTENT_PARAMS      : Set các params chứa nội dung file nhiều dòng
 * - extractParamValue() : Extract giá trị param từ XML tag
 * - parseToolAction()   : Parse tool action (passthrough)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { decodeHtmlEntities } from "./HtmlEntitiesDecoder";

// ─── Constants ──────────────────────────────────────────────────────────
/**
 * Params chứa nội dung file nhiều dòng — KHÔNG được trim để
 * newline đầu/cuối (là các dòng code có ý nghĩa) được bảo toàn
 * khi stream SSE bị chia thành nhiều chunk.
 */
export const CONTENT_PARAMS = new Set([
  "content",
  "diff",
  "old_content",
  "new_content",
  "old_str",
  "new_str",
  "old",
  "new",
]);

/**
 * Heuristic: check whether a position in `str` falls inside an unterminated
 * single-quote or double-quote span that started AFTER `fromIdx`. Used to
 * distinguish real XML/JSON closing delimiters from literal `</tag>` strings
 * embedded inside shell commands or code content.
 */
const isInsideUnterminatedQuote = (
  str: string,
  pos: number,
  fromIdx: number,
): boolean => {
  let inSingle = false;
  let inDouble = false;
  let escape = false;

  for (let i = fromIdx; i < pos; i++) {
    const ch = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
    } else if (!inSingle && ch === '"') {
      inDouble = !inDouble;
    }
  }
  return inSingle || inDouble;
};

export const extractParamValue = (
  content: string,
  paramName: string,
): string | null => {
  // Whether this param holds raw file content (no aggressive trimming allowed)
  const isContentParam = CONTENT_PARAMS.has(paramName);

  // Use manual tag matching to avoid regex confusion with JSX/HTML in content
  const openingTag = new RegExp(`<${paramName}(?:\\s+[^>]*)?>`, "i");
  const openingMatch = content.match(openingTag);

  if (openingMatch) {
    const startIndex = openingMatch.index! + openingMatch[0].length;

    const closingTag = `</${paramName}>`;

    let depth = 1;
    let searchIndex = startIndex;

    while (depth > 0 && searchIndex < content.length) {
      const nextOpening = content.indexOf(`<${paramName}`, searchIndex);
      const nextClosing = content.indexOf(closingTag, searchIndex);

      if (nextClosing === -1) {
        break;
      }

      if (nextOpening !== -1 && nextOpening < nextClosing) {
        const potentialTag = content.substring(
          nextOpening,
          nextOpening + paramName.length + 2,
        );
        if (potentialTag.match(new RegExp(`^<${paramName}(?:\\s|>)`, "i"))) {
          depth++;
          searchIndex = nextOpening + paramName.length + 1;
        } else {
          searchIndex = nextOpening + 1;
        }
      } else {
        if (
          depth === 1 &&
          isInsideUnterminatedQuote(content, nextClosing, startIndex)
        ) {
          searchIndex = nextClosing + closingTag.length;
          continue;
        }

        depth--;
        if (depth === 0) {
          let value = content.substring(startIndex, nextClosing);
          value = value.replace(/^```text\s*\n?|\n?```\s*$/g, "");
          const decoded = decodeHtmlEntities(value);
          const result = isContentParam
            ? decoded.replace(/^\n|\n$/g, "")
            : decoded.trim();
          return result;
        }
        searchIndex = nextClosing + closingTag.length;
      }
    }
  }

  // Fallback: Try regex-based extraction (legacy support)
  const standardRegex = new RegExp(
    `<${paramName}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${paramName}>`,
    "i",
  );
  const standardMatch = content.match(standardRegex);
  if (standardMatch) {
    let value = standardMatch[1];
    value = value.replace(/^```text\s*\n?|\n?```\s*$/g, "");
    const decoded = decodeHtmlEntities(value);
    return isContentParam ? decoded.replace(/^\n|\n$/g, "") : decoded.trim();
  }
  return null;
};

/**
 * Parse tool actions. Currently a no-op passthrough since all tools
 * have dedicated parsers in their tag folders.
 */
export const parseToolAction = (
  toolName: string,
  _innerContent: string,
  rawXml: string,
): any => {
  const params: Record<string, any> = {};

  return {
    type: toolName as any,
    params,
    rawXml,
  };
};
