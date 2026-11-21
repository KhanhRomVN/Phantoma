import type { UpdateFuzzerContentParams } from './update-fuzzer-content.parser';
import { FuzzyMatcher } from '@renderer/modules/Code/utils/FuzzyMatcher';
import {
  UpdateFuzzerContentHandler,
  type FuzzerTarget,
} from './update-fuzzer-content.handler';
import { resolveFuzzer } from '@renderer/modules/Emulate/shared/utils/fuzzer-resolver.util';
import { runTool } from '@renderer/modules/Emulate/shared/utils/tool-result.util';

const handler = new UpdateFuzzerContentHandler();
const TOOL = '[update_fuzzer_content]';
const MAX_FUZZY_SCORE = 0.3;

/** Execute update_fuzzer_content tool — replace text trong file fuzzer qua handler IPC */
export async function executeUpdateFuzzerContent(
  params: UpdateFuzzerContentParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('update_fuzzer_content', async () => {
    if (!params.fuzzer_id) throw new Error('fuzzer_id is required');
    if (!params.target) throw new Error('target is required');

    const target = params.target as FuzzerTarget;
    const oldContent = params.old_content || '';
    const newContent = params.new_content || '';

    const resolved = await resolveFuzzer(
      'update_fuzzer_content',
      params.fuzzer_id,
      contextTargetId,
    );
    if (resolved.error !== undefined) return resolved.error;

    let fileContent: string;
    try {
      fileContent = await handler.read(resolved.targetId, resolved.req.id, target);
    } catch (readErr: any) {
      return `${TOOL} Error: Cannot read ${target}: ${readErr.message || String(readErr)}`;
    }

    const normalizedContent = fileContent.replace(/\r\n/g, '\n');
    const normalizedOld = oldContent.replace(/\r\n/g, '\n');
    const normalizedNew = newContent.replace(/\r\n/g, '\n');

    let targetText = normalizedOld;
    let targetPos = normalizedContent.indexOf(normalizedOld);

    if (targetPos === -1) {
      const fuzzy = FuzzyMatcher.findMatch(normalizedContent, normalizedOld);
      if (!fuzzy || fuzzy.score > MAX_FUZZY_SCORE) {
        return `${TOOL} Error: old_content not found in ${target}\n\nDEBUG INFO:\n- Current ${target} content:\n${fileContent}\n\n- Searching for:\n${oldContent}\n\nSuggestion: Check the exact text in the file or try with more context.`;
      }
      targetText = fuzzy.originalText;
      targetPos = normalizedContent.indexOf(targetText);
      if (targetPos === -1) return `${TOOL} Error: Could not locate text in ${target}`;
    }

    const updatedContent =
      normalizedContent.slice(0, targetPos) +
      normalizedNew +
      normalizedContent.slice(targetPos + targetText.length);

    let finalContent = updatedContent;
    if (target === 'params' || target === 'headers') {
      try {
        finalContent = JSON.stringify(JSON.parse(updatedContent), null, 2);
      } catch (parseErr) {
        const reason = parseErr instanceof Error ? parseErr.message : String(parseErr);
        return `${TOOL} Error: Result is not valid JSON\n\nInvalid content:\n${updatedContent}\n\nParse error: ${reason}\n\n⚠️ Original file content has been preserved.\n\nSuggestion: Check your new_content syntax.`;
      }
    }

    try {
      await handler.write(resolved.targetId, resolved.req.id, target, finalContent);
    } catch (writeErr: any) {
      return `${TOOL} Error: Failed to update ${target}: ${writeErr.message || String(writeErr)}`;
    }

    window.dispatchEvent(new CustomEvent('fuzzer-updated'));
    return `${TOOL} Updated ${params.fuzzer_id} ${target}`;
  });
}