import type { UpdateRepeaterContentParams } from '../parsers/UpdateRepeaterContentParser';
import { FuzzyMatcher } from '../../Code/utils/FuzzyMatcher';
import {
  UpdateRepeaterContentHandler,
  type RepeaterTarget,
} from '../handler/UpdateRepeaterContentHandler';
import { resolveRepeater } from '../utils/repeater-resolver.util';
import { runTool } from '../utils/tool-result.util';

const handler = new UpdateRepeaterContentHandler();
const TOOL = '[update_repeater_content]';
const MAX_FUZZY_SCORE = 0.3;

/** Execute update_repeater_content tool — replace text trong file repeater qua handler IPC */
export async function executeUpdateRepeaterContent(
  params: UpdateRepeaterContentParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('update_repeater_content', async () => {
    if (!params.repeater_id) throw new Error('repeater_id is required');
    if (!params.target) throw new Error('target is required');

    const target = params.target as RepeaterTarget;
    const oldContent = params.old_content || '';
    const newContent = params.new_content || '';

    const resolved = await resolveRepeater(
      'update_repeater_content',
      params.repeater_id,
      contextTargetId,
    );
    if (resolved.error !== undefined) return resolved.error;

    const filePath = await handler.getFilePath(resolved.targetId, resolved.req.id, target);

    let fileContent: string;
    try {
      fileContent = await handler.readFile(filePath);
    } catch (readErr: any) {
      console.warn(
        `[UpdateRepeaterContentExecutor] File not found: ${filePath} (${readErr.message || String(readErr)})`,
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

    window.dispatchEvent(new CustomEvent('repeater-updated'));
    return `${TOOL} Updated ${params.repeater_id} ${target}`;
  });
}