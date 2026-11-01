/**
 * ------------------------------------------------------------------
 * Tool Mutation Registry
 * ------------------------------------------------------------------
 * Registry cho các tool có khả năng thay đổi filesystem/state.
 * ------------------------------------------------------------------
 */

import type {
  ToolMutationChecker,
  FilePathExtractor,
  SingleLineReviewChecker,
  DiffCalculator,
  RawContentDiffExtractor,
} from '../types/tool-mutation';
import type { ToolAction } from '../services/responseParser';

// ─── Registry State ─────────────────────────────────────────────────────
const mutationCheckers: ToolMutationChecker[] = [];
const filePathExtractors: FilePathExtractor[] = [];
const singleLineReviewCheckers: SingleLineReviewChecker[] = [];
const diffCalculators: DiffCalculator[] = [];
const rawContentDiffExtractors: RawContentDiffExtractor[] = [];

// ─── Registration API ───────────────────────────────────────────────────
export const registerMutationChecker = (checker: ToolMutationChecker): void => {
  mutationCheckers.push(checker);
};

export const registerFilePathExtractor = (extractor: FilePathExtractor): void => {
  filePathExtractors.push(extractor);
};

export const registerSingleLineReviewChecker = (checker: SingleLineReviewChecker): void => {
  singleLineReviewCheckers.push(checker);
};

export const registerDiffCalculator = (calculator: DiffCalculator): void => {
  diffCalculators.push(calculator);
};

export const registerRawContentDiffExtractor = (extractor: RawContentDiffExtractor): void => {
  rawContentDiffExtractors.push(extractor);
};

// ─── Query API ──────────────────────────────────────────────────────────
/**
 * Check if tool mutates files/state.
 */
export const checkToolMutation = (
  action: ToolAction,
): { mutates: boolean; mutationType?: 'create' | 'modify' | 'delete' } => {
  for (const checker of mutationCheckers) {
    const result = checker(action);
    if (result.mutates) return result;
  }
  return { mutates: false };
};

/**
 * Extract file path from tool action.
 */
export const extractFilePath = (action: ToolAction): string | null => {
  for (const extractor of filePathExtractors) {
    const result = extractor(action);
    if (result !== null) return result;
  }
  return null;
};

/**
 * Check if tool needs single-line content review.
 */
export const needsSingleLineReview = (action: ToolAction): boolean => {
  return singleLineReviewCheckers.some((checker) => checker(action));
};

/**
 * Calculate diff stats for a mutation tool.
 */
export const calculateDiff = (
  action: ToolAction,
): { additions: number; deletions: number } | null => {
  for (const calculator of diffCalculators) {
    const result = calculator(action);
    if (result !== null) return result;
  }
  return null;
};

/**
 * Extract diff stats from raw content (for streaming messages).
 * Returns first non-empty result.
 */
export const extractRawContentDiff = (
  content: string,
): Map<string, { additions: number; deletions: number }> => {
  for (const extractor of rawContentDiffExtractors) {
    const result = extractor(content);
    if (result.size > 0) return result;
  }
  return new Map();
};

/**
 * Check if content contains any mutation tool calls.
 * Used for quick early-exit optimization in stats calculation.
 */
export const hasMutationTools = (content: string): boolean => {
  // Delegate to registered extractors - if any return non-empty, content has mutations
  for (const extractor of rawContentDiffExtractors) {
    const result = extractor(content);
    if (result.size > 0) return true;
  }
  return false;
};