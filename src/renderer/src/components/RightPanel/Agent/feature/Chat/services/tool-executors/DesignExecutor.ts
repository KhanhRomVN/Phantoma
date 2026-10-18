/**
 * ------------------------------------------------------------------
 * Design Executor
 * ------------------------------------------------------------------
 * Thực thi các design tools trên design đang mở (useDesignStore) của
 * project hiện tại, thông qua các IPC design:* ở main process.
 * Design folder phẳng: file_path luôn là tên file (Home.tsx, site.ts).
 *
 * Main functions:
 * - executeDesignReadFile()   : Thực thi read_file tool
 * - executeDesignCreateFile() : Thực thi create_file tool
 * - executeDesignUpdateFile() : Thực thi update_file tool
 * - executeDesignListFiles()  : Thực thi list_files tool
 * - executeDesignGrep()       : Thực thi grep tool
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Stores ──
import { useCodeStore } from '@renderer/modules/Code/hooks/useCodeStore';
import { useDesignStore } from '@renderer/modules/Code/hooks/useDesignStore';

// ── Types ──
import type {
  DesignCreateFileParams,
  DesignGrepParams,
  DesignReadFileParams,
  DesignUpdateFileParams,
} from '../parsers/DesignParser';

// ─── Constants ──────────────────────────────────────────────────────────
const MAX_GREP_MATCHES_PER_FILE = 50;
const MAX_GREP_LINE_LENGTH = 200;

interface DesignFileInfo {
  name: string;
  lines: number;
}

type DesignContext = { projectPath: string; designId: string };

// ─── Helpers ────────────────────────────────────────────────────────────
const getDesignContext = (): DesignContext | { error: string } => {
  const code = useCodeStore.getState();
  const project = code.projects.find((p) => p.id === code.currentProjectId);
  const designId = useDesignStore.getState().activeDesignId;
  if (!project?.path) return { error: 'No project is open' };
  if (!designId) {
    return { error: 'No design is open. Ask the user to open or create a design first.' };
  }
  return { projectPath: project.path, designId };
};

const failure = (label: string, error: string): string => `[${label}] Result: Error - ${error}`;

const refreshDesigns = async (projectPath: string): Promise<void> => {
  try {
    await useDesignStore.getState().loadDesigns(projectPath);
  } catch {
    /* canvas refresh is best-effort */
  }
};

const readDesignFile = async (ctx: DesignContext, fileName: string) =>
  window.api.invoke('design:read-file', ctx.projectPath, ctx.designId, fileName);

const writeDesignFile = async (ctx: DesignContext, fileName: string, content: string) =>
  window.api.invoke('design:write-file', ctx.projectPath, ctx.designId, fileName, content);

// ===== ReadFileExecutor =====

export async function executeDesignReadFile(params: DesignReadFileParams): Promise<string> {
  const label = `read_file for '${params.file_path}'`;
  if (params._validationError) return failure(label, params._validationError);
  const ctx = getDesignContext();
  if ('error' in ctx) return failure(label, ctx.error);

  const res = await readDesignFile(ctx, params.file_path);
  if (!res?.success) return failure(label, res?.error || 'Failed to read file');

  let content: string = res.data;
  if (params.start_line || params.end_line) {
    const lines = content.split('\n');
    const start = Math.max(1, params.start_line ?? 1);
    const end = Math.min(lines.length, params.end_line ?? lines.length);
    content = lines.slice(start - 1, end).join('\n');
  }
  return `[${label}] Result:\n\`\`\`\n${content}\n\`\`\``;
}

// ===== CreateFileExecutor =====

export async function executeDesignCreateFile(params: DesignCreateFileParams): Promise<string> {
  const label = `create_file for '${params.file_path}'`;
  if (params._validationError) return failure(label, params._validationError);
  const ctx = getDesignContext();
  if ('error' in ctx) return failure(label, ctx.error);

  const res = await writeDesignFile(ctx, params.file_path, params.content);
  if (!res?.success) return failure(label, res?.error || 'Failed to write file');

  await refreshDesigns(ctx.projectPath);
  const { created, node } = res.data ?? {};
  const base = created ? 'File created successfully' : 'File overwritten successfully';
  const nodeNote = node
    ? ` Page node added to the canvas (name: ${node.name}, route: ${node.route}).`
    : '';
  return `[${label}] Result: ${base}.${nodeNote}`;
}

// ===== UpdateFileExecutor =====

export async function executeDesignUpdateFile(params: DesignUpdateFileParams): Promise<string> {
  const label = `update_file for '${params.file_path}'`;
  if (params._validationError) return failure(label, params._validationError);
  const ctx = getDesignContext();
  if ('error' in ctx) return failure(label, ctx.error);

  const readRes = await readDesignFile(ctx, params.file_path);
  if (!readRes?.success) return failure(label, readRes?.error || 'Failed to read file');

  const original: string = readRes.data;
  const occurrences = original.split(params.old_content).length - 1;
  if (occurrences === 0) {
    return failure(label, 'old_content was not found in the file. Re-read the file and copy the snippet byte-for-byte.');
  }
  if (occurrences > 1) {
    return failure(label, `old_content matches ${occurrences} places. Include more surrounding lines so it matches exactly once.`);
  }

  const updated = original.replace(params.old_content, () => params.new_content);
  const writeRes = await writeDesignFile(ctx, params.file_path, updated);
  if (!writeRes?.success) return failure(label, writeRes?.error || 'Failed to write file');

  await refreshDesigns(ctx.projectPath);
  return `[${label}] Result: File updated successfully`;
}

// ===== ListFilesExecutor =====

export async function executeDesignListFiles(): Promise<string> {
  const label = 'list_files';
  const ctx = getDesignContext();
  if ('error' in ctx) return failure(label, ctx.error);

  const res = await window.api.invoke('design:list-files', ctx.projectPath, ctx.designId);
  if (!res?.success) return failure(label, res?.error || 'Failed to list files');

  const files: DesignFileInfo[] = res.data ?? [];
  let output = `[${label}] Found ${files.length} file(s)\n\n`;
  output += files.length > 0 ? files.map((f) => `- ${f.name} (${f.lines} lines)`).join('\n') : '(no files)';

  const design = useDesignStore.getState().designs.find((d) => d.id === ctx.designId);
  if (design && design.nodes.length > 0) {
    output +=
      '\n\nPages on the canvas:\n' +
      design.nodes.map((n) => `- ${n.name} — route ${n.route} — ${n.file}`).join('\n');
  }
  return output;
}

// ===== GrepExecutor =====

export async function executeDesignGrep(params: DesignGrepParams): Promise<string> {
  const label = `grep for '${params.search_term}'`;
  if (params._validationError) return failure(label, params._validationError);
  const ctx = getDesignContext();
  if ('error' in ctx) return failure(label, ctx.error);

  const listRes = await window.api.invoke('design:list-files', ctx.projectPath, ctx.designId);
  if (!listRes?.success) return failure(label, listRes?.error || 'Failed to list files');

  const regex = new RegExp(params.search_term, 'i');
  const files: DesignFileInfo[] = listRes.data ?? [];
  const blocks: string[] = [];
  let totalMatches = 0;

  for (const file of files) {
    const readRes = await readDesignFile(ctx, file.name);
    if (!readRes?.success) continue;

    const matches: string[] = [];
    (readRes.data as string).split('\n').forEach((line, index) => {
      if (matches.length >= MAX_GREP_MATCHES_PER_FILE || !regex.test(line)) return;
      const text = line.trim().slice(0, MAX_GREP_LINE_LENGTH);
      matches.push(`  ${index + 1}: ${text}`);
    });
    if (matches.length === 0) continue;

    totalMatches += matches.length;
    blocks.push(
      `<file path="${file.name}" lines="${file.lines}" matches="${matches.length}">\n${matches.join('\n')}\n</file>`,
    );
  }

  if (blocks.length === 0) {
    return `[${label}] Result: No matches found (${files.length} files searched)`;
  }
  return (
    `[${label}] Result:\n<grep_results search="${params.search_term}" total_matches="${totalMatches}" files="${blocks.length}" files_searched="${files.length}">\n` +
    blocks.join('\n') +
    '\n</grep_results>'
  );
}