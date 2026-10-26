import {
  registerUnsavedProvider,
  type UnsavedItem,
} from '@renderer/shared/unsaved/unsavedRegistry';
import { useCodeStore } from '../hooks/useCodeStore';

const baseName = (p: string) => p.split('/').pop() || p;

registerUnsavedProvider({
  id: 'code',
  label: 'Code',
  getItems: () =>
    useCodeStore.getState().projects.flatMap((project): UnsavedItem[] =>
      Array.from(project.unsavedFiles).map((fileId) => {
        const panel = project.workspacePanels.find((p) => p.id === fileId);
        const filePath = panel?.filePath ?? project.fileNodeMap[fileId]?.path ?? '';
        const relative = filePath.startsWith(project.path)
          ? filePath.slice(project.path.length).replace(/^\/+/, '')
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
    await window.api.invoke('fs:write-file', node.path, content);
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