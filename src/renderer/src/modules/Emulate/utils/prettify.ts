/**
 * ------------------------------------------------------------------
 * Code Prettify Utility
 * ------------------------------------------------------------------
 * Tiện ích format code (JavaScript, TypeScript, HTML, CSS, JSON)
 * bằng simple beautifier tùy chỉnh. Cung cấp các hàm kiểm tra
 * code đã được prettify hay bị minified chưa.
 *
 * Các hàm chính:
 * - prettifyCode()   : Format code, trả về kết quả kèm lỗi (nếu có)
 * - isCodePrettified() : Kiểm tra code đã được format chưa
 * - isMinified()     : Kiểm tra code có bị minified không
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { logger } from '@renderer/utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
function simpleBeautify(code: string): string {
  let result = '';
  let indent = 0;
  const tab = '  ';
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inMultiLineComment = false;
  let buffer = '';

  const flushBuffer = () => {
    if (buffer) {
      result += buffer;
      buffer = '';
    }
  };

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1];
    const prevChar = code[i - 1];

    // Handle comments
    if (!inString && !inComment && !inMultiLineComment && char === '/' && nextChar === '/') {
      inComment = true;
      buffer += char;
      continue;
    }
    if (inComment && char === '\n') {
      inComment = false;
      buffer += '\n' + tab.repeat(indent);
      flushBuffer();
      continue;
    }
    if (!inString && !inComment && !inMultiLineComment && char === '/' && nextChar === '*') {
      inMultiLineComment = true;
      buffer += char;
      continue;
    }
    if (inMultiLineComment && char === '*' && nextChar === '/') {
      inMultiLineComment = false;
      buffer += '*/';
      i++;
      continue;
    }

    if (inComment || inMultiLineComment) {
      buffer += char;
      continue;
    }

    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
      buffer += char;
      continue;
    }

    if (inString) {
      buffer += char;
      continue;
    }

    // Handle brackets and indentation
    if (char === '{' || char === '[') {
      buffer += char;
      if (nextChar !== '}' && nextChar !== ']') {
        indent++;
        buffer += '\n' + tab.repeat(indent);
        flushBuffer();
      }
    } else if (char === '}' || char === ']') {
      if (prevChar !== '{' && prevChar !== '[' && prevChar !== '\n') {
        indent = Math.max(0, indent - 1);
        buffer += '\n' + tab.repeat(indent);
      } else if (prevChar === '\n') {
        indent = Math.max(0, indent - 1);
        const removeLen = tab.length;
        if (result.endsWith(tab)) {
          result = result.slice(0, -removeLen);
        }
      }
      buffer += char;
    } else if (char === ';') {
      buffer += char;
      if (nextChar !== '\n' && nextChar !== '}' && nextChar !== ' ' && nextChar !== ';') {
        buffer += '\n' + tab.repeat(indent);
        flushBuffer();
      }
    } else if (char === ',') {
      buffer += char;
      if (nextChar !== '\n' && nextChar !== ' ' && nextChar !== '\r') {
        buffer += ' ';
      }
    } else if (char === '\n' || char === '\r') {
      continue;
    } else {
      buffer += char;
    }

    if (buffer.length > 10000) {
      flushBuffer();
    }
  }

  flushBuffer();
  return result;
}

export async function prettifyCode(code: string): Promise<{ formatted: string; error?: string }> {
  try {
    const formatted = simpleBeautify(code);

    if (formatted.length === 0) {
      throw new Error('Beautify returned empty result');
    }

    return { formatted };
  } catch (error) {
    logger.warn('[Prettify] Error formatting code:', error);
    return {
      formatted: code,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function isCodePrettified(code: string): boolean {
  const lines = code.split('\n');
  if (lines.length <= 1) return false;

  const avgLineLength = code.length / lines.length;
  if (avgLineLength > 300) {
    return false;
  }

  let indentedLines = 0;
  let totalNonEmptyLines = 0;

  const sampleSize = Math.min(lines.length, 100);
  for (let i = 0; i < sampleSize; i++) {
    const line = lines[i].trim();
    if (line.length > 0) {
      totalNonEmptyLines++;
      if (lines[i].match(/^[\s\t]+/)) {
        indentedLines++;
      }
    }
  }

  return totalNonEmptyLines > 0 && indentedLines / totalNonEmptyLines > 0.3;
}

export function isMinified(code: string): boolean {
  if (isCodePrettified(code)) return false;

  const lines = code.split('\n');
  const avgLineLength = code.length / lines.length;

  if (avgLineLength > 300) {
    return true;
  }

  if (lines.length < 10 && code.length > 1000) {
    return true;
  }

  let indentedCount = 0;
  const checkLines = Math.min(lines.length, 50);
  for (let i = 0; i < checkLines; i++) {
    if (lines[i].match(/^[\s\t]+/)) {
      indentedCount++;
    }
  }

  if (indentedCount < checkLines * 0.2) {
    return true;
  }

  return false;
}