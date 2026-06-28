/**
 * Code prettify utility
 * Formats JavaScript, TypeScript, HTML, CSS, and JSON code
 */

interface PrettifyOptions {
  parser?: 'babel' | 'typescript' | 'html' | 'css' | 'json';
  printWidth?: number;
  tabWidth?: number;
  useTabs?: boolean;
  semi?: boolean;
  singleQuote?: boolean;
}

/**
 * Simple JavaScript beautifier (fallback when Prettier fails)
 * Optimized for large files
 */
function simpleBeautify(code: string): string {
  console.log('[Prettify] Starting beautify for code length:', code.length);
  const startTime = performance.now();
  
  let result = '';
  let indent = 0;
  const tab = '  ';
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inMultiLineComment = false;
  let buffer = ''; // Buffer for batch append

  // Batch append for better performance
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
        // Remove last indent
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
      // Skip existing line breaks, we add them ourselves
      continue;
    } else {
      buffer += char;
    }

    // Flush buffer periodically for memory efficiency
    if (buffer.length > 10000) {
      flushBuffer();
    }
  }

  // Flush remaining buffer
  flushBuffer();

  const endTime = performance.now();
  console.log(`[Prettify] Beautify completed in ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`[Prettify] Input: ${code.length} chars, Output: ${result.length} chars`);
  
  return result;
}

/**
 * Prettify code using Prettier (browser-compatible approach)
 */
export async function prettifyCode(
  code: string,
  language: string = 'javascript',
  options: PrettifyOptions = {}
): Promise<{ formatted: string; error?: string }> {
  console.log('[Prettify] Request to format', language, 'code:', code.length, 'chars');
  
  // Determine parser based on language
  const parserMap: Record<string, string> = {
    javascript: 'babel',
    js: 'babel',
    typescript: 'typescript',
    ts: 'typescript',
    jsx: 'babel',
    tsx: 'typescript',
    html: 'html',
    css: 'css',
    json: 'json',
  };

  const parser = options.parser || parserMap[language.toLowerCase()] || 'babel';

  // Default options
  const prettierOptions = {
    parser,
    printWidth: options.printWidth || 100,
    tabWidth: options.tabWidth || 2,
    useTabs: options.useTabs || false,
    semi: options.semi !== undefined ? options.semi : true,
    singleQuote: options.singleQuote !== undefined ? options.singleQuote : true,
    trailingComma: 'es5' as const,
    bracketSpacing: true,
    arrowParens: 'always' as const,
  };

  try {
    // Check file size and warn for very large files
    const sizeKB = code.length / 1024;
    if (sizeKB > 500) {
      console.warn(`[Prettify] Large file detected: ${sizeKB.toFixed(0)}KB - formatting may take time`);
    }
    
    // Use simple beautifier (Prettier integration can be added later)
    console.log('[Prettify] Using simple beautifier for', language);
    
    // For very large files, show progress
    if (code.length > 100000) {
      console.log('[Prettify] Processing large file, please wait...');
    }
    
    const formatted = simpleBeautify(code);
    
    if (formatted.length === 0) {
      throw new Error('Beautify returned empty result');
    }
    
    return { formatted };
  } catch (error) {
    console.error('[Prettify] Error formatting code:', error);
    return {
      formatted: code,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if code is already prettified (has proper indentation)
 */
export function isCodePrettified(code: string): boolean {
  // Check if code has newlines and indentation
  const lines = code.split('\n');
  if (lines.length <= 1) return false;

  // For files with many lines, check average line length
  // Minified files have very long lines even if they have line breaks
  const avgLineLength = code.length / lines.length;
  if (avgLineLength > 300) {
    // If average line is > 300 chars, likely still minified
    return false;
  }

  // Check if at least some lines have indentation
  let indentedLines = 0;
  let totalNonEmptyLines = 0;
  
  // Sample first 100 lines for performance
  const sampleSize = Math.min(lines.length, 100);
  for (let i = 0; i < sampleSize; i++) {
    const line = lines[i].trim();
    if (line.length > 0) {
      totalNonEmptyLines++;
      // Check if original line (before trim) has leading whitespace
      if (lines[i].match(/^[\s\t]+/)) {
        indentedLines++;
      }
    }
  }

  // If more than 30% of non-empty lines are indented, consider it prettified
  return totalNonEmptyLines > 0 && (indentedLines / totalNonEmptyLines) > 0.3;
}

/**
 * Detect if code is minified
 */
export function isMinified(code: string): boolean {
  // Quick check: if already prettified, not minified
  if (isCodePrettified(code)) return false;

  // Heuristics for minified code:
  // 1. Very long lines (average > 300 chars)
  // 2. Few line breaks relative to code size
  // 3. No or minimal indentation

  const lines = code.split('\n');
  const avgLineLength = code.length / lines.length;

  // If average line length > 300, likely minified
  if (avgLineLength > 300) {
    console.log('[Prettify] Detected minified: avgLineLength =', avgLineLength.toFixed(0));
    return true;
  }

  // If less than 10 lines for more than 1000 chars, likely minified
  if (lines.length < 10 && code.length > 1000) {
    console.log('[Prettify] Detected minified: few lines for large code');
    return true;
  }

  // Check for lack of indentation in first 50 lines
  let indentedCount = 0;
  const checkLines = Math.min(lines.length, 50);
  for (let i = 0; i < checkLines; i++) {
    if (lines[i].match(/^[\s\t]+/)) {
      indentedCount++;
    }
  }

  if (indentedCount < checkLines * 0.2) {
    console.log('[Prettify] Detected minified: lack of indentation');
    return true;
  }

  return false;
}
