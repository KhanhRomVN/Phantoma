/**
 * ------------------------------------------------------------------
 * Unsaved Service
 * ------------------------------------------------------------------
 * Đăng ký provider "code" với UnsavedProvider: liệt kê các file chưa lưu
 * của mọi project và cung cấp hàm lưu từng file (ưu tiên nội dung từ Monaco).
 * Chỉ cần import file này để kích hoạt việc đăng ký (side-effect).
 *
 * Main functions:
 * - registerUnsavedProvider() : Đăng ký getItems/saveItem cho Code module
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Components ──
import {
  registerUnsavedProvider,
  type UnsavedItem,
} from '@renderer/providers/UnsavedProvider';

// ── Services ──
import { codeApi } from '../api/code.api';

// ── Stores ──
import { useCodeStore } from '../stores/code.store';

// ─── Functions ───────────────────────────────────────────────────────────────
const baseName = (p: string) => p.split('/').pop() || p;

registerUnsavedProvider({
  id: 'code',
  label: 'Code',
  getItems: () =>
    useCodeStore.getState().projects.flatMap((project): UnsavedItem[] =>
      Array.from(project.unsavedFiles).map((fileId) => {
        const panel = project.workspacePanels.find((p) => p.id === fileId);
        const filePath = panel?.filePath ?? project.fileNodeMap[fileId]?.path ?? '';
        const root = project.explorerRoot ?? project.path;
        const relative = filePath.startsWith(root)
          ? filePath.slice(root.length).replace(/^\/+/, '')
          : filePath;
        return {
          id: fileId,
          name: panel?.title || (filePath ? baseName(filePath) : fileId),
          detail: relative ? `${project.name} · ${relative}` : project.name,
        };
      }),
    ),
  saveItem: async (fileId) => {
    const project = useCodeStore.getState().projects.find((p) => p.unsavedFiles.has(fileId));
    const node = project?.fileNodeMap[fileId];
    if (!project || !node?.path) return;
    const monaco = (window as any).monaco;
    const model = monaco?.editor.getModel(monaco.Uri.parse('file://' + node.path));
    const content: string | undefined = model ? model.getValue() : node.content;
    if (content === undefined) return;
    await codeApi.fs.writeFile(node.path, content, true);
    useCodeStore.setState((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== project.id) return p;
        const unsavedFiles = new Set(p.unsavedFiles);
        unsavedFiles.delete(fileId);
        return {
          ...p,
          unsavedFiles,
          originalContents: { ...p.originalContents, [fileId]: content },
        };
      }),
    }));
  },
});