/**
 * ------------------------------------------------------------------
 * Grep Parser
 * ------------------------------------------------------------------
 * Parse nội dung tag grep từ phản hồi của AI thành params, kèm kiểm tra
 * tính hợp lệ của regex pattern.
 *
 * Main functions:
 * - parseGrep() : Trích xuất search_term, file_path, folder_path và validate regex
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { extractParamValue } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ── Types ──
import type { GrepParams } from '../tool.types';

// ─── Functions ───────────────────────────────────────────────────────────────
/**
 * Validate regex pattern using Rust regex syntax
 * Returns error message if invalid, null if valid
 */
const validateRegexPattern = (pattern: string): string | null => {
  if (!pattern || pattern.trim() === '') {
    return 'Empty search pattern';
  }

  try {
    // Test basic JavaScript regex compatibility
    // Note: Rust regex syntax differs slightly from JS, but this catches most errors
    new RegExp(pattern);

    // Additional checks for common Rust regex incompatibilities
    // Rust doesn't support lookbehind/lookahead
    if (pattern.includes('(?<') || pattern.includes('(?!') || pattern.includes('(?=')) {
      return 'Lookbehind/lookahead assertions are not supported. Use simpler pattern.';
    }

    return null; // Valid
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown regex error';
    return `Invalid regex pattern: ${message}`;
  }
};

export const parseGrep = (innerContent: string): GrepParams => {
  // Parse according to tools-reference.ts schema: search_term (required), file_path OR folder_path (optional)
  const searchTerm = extractParamValue(innerContent, 'search_term');
  const filePath = extractParamValue(innerContent, 'file_path');
  const folderPath = extractParamValue(innerContent, 'folder_path');


  const searchTermValue = searchTerm || '';

  // Validate regex pattern
  const validationError = validateRegexPattern(searchTermValue);

  if (validationError) {
    console.warn('[Zen][GrepParser] Invalid regex pattern:', {
      pattern: searchTermValue,
      error: validationError,
      innerContent: innerContent.substring(0, 200), // Log first 200 chars for debug
    });
  }

  return {
    search_term: searchTermValue,
    file_path: filePath || undefined,
    folder_path: folderPath || undefined,

    _validationError: validationError || undefined,
  };
};
