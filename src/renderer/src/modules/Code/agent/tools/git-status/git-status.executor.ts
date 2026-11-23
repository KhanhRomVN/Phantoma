/**
 * ------------------------------------------------------------------
 * Git Status Executor
 * ------------------------------------------------------------------
 * Display-only tool - không thực thi, chỉ trả về marker để UI render.
 * ------------------------------------------------------------------
 */

import { DISPLAY_ONLY_RESULT } from '@renderer/components/Widgets/Zen/feature/Chat/types/executor-types';
import type { ExecutorContext } from '@renderer/components/Widgets/Zen/feature/Chat/types/executor-types';

export async function executeGitStatus(
  _params: Record<string, any>,
  _ctx: ExecutorContext,
): Promise<string> {
  return DISPLAY_ONLY_RESULT;
}
