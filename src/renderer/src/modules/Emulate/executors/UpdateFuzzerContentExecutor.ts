import type { UpdateFuzzerContentParams } from '../parsers/UpdateFuzzerContentParser';
import {
  UpdateFuzzerContentHandler,
  type FuzzerTarget,
} from '../handler/UpdateFuzzerContentHandler';
import { resolveFuzzer } from '../utils/fuzzer-resolver.util';
import { runTool } from '../utils/tool-result.util';
import { FuzzyMatcher } from '@renderer/modules/Code/shared/utils/fuzzy-matcher.util';

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

    const filePath = await handler.getFilePath(resolved.targetId, resolved.req.id, target);

    let fileContent: string;
    try {
      fileContent = await handler.readFile(filePath);
    } catch (readErr: any) {
      console.warn(
        `[UpdateFuzzerContentExecutor] File not found: ${filePath} (${readErr.message || String(readErr)})`,
      );
      const defaultContent = target === 'body' ? '' : '[]';
      try {
        await handler.writeFile(filePath, defaultContent);
        fileContent = defaultContent;
      } catch (writeErr: any) {
        return `${TOOL} Error: Cannot create file: ${writeErr.message || String(writeErr)}`;
      }
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
      await handler.writeFile(filePath, finalContent);
    } catch (writeErr: any) {
      const reason = writeErr.message || String(writeErr);
      try {
        await handler.writeFile(filePath, fileContent);
        return `${TOOL} Error: Failed to write file: ${reason}\n\n⚠️ Original content has been restored.`;
      } catch {
        return `${TOOL} Error: Failed to write file: ${reason}\n\n⚠️ CRITICAL: Could not restore backup. Manual recovery may be needed.`;
      }
    }

    window.dispatchEvent(new CustomEvent('fuzzer-updated'));
    return `${TOOL} Updated ${params.fuzzer_id} ${target}`;
  });
}
