import { ZEN_INSERT_TEXT_EVENT } from '@renderer/components/Widgets/Zen/shared/events';
import { getStashedMarkers } from '@renderer/components/common/CodeBlock';
import { useCodeStore } from '../../../hooks/useCodeStore';

const SEVERITY_WARNING = 4;
const SEVERITY_ERROR = 8;

const toRelativePath = (filePath: string): string => {
  const s = useCodeStore.getState();
  const project = s.projects.find((p) => p.id === s.currentProjectId);
  const root = (project?.explorerRoot ?? project?.path)?.replace(/\/+$/, '');
  return root && filePath.startsWith(root + '/') ? filePath.slice(root.length + 1) : filePath;
};

const fenceFor = (text: string): string => {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((m) => m.length));
  return '`'.repeat(Math.max(3, longest + 1));
};

// ASSUMED: "gần nhất" = Zen tab đang hiển thị gần editor nhất; nếu không có tab nào hiển thị thì lấy Zen tab ẩn gần nhất.
const findZenInput = (anchor: HTMLElement): HTMLElement | null => {
  const a = anchor.getBoundingClientRect();
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('[data-zen-drop-root]'))
    .map((root) => {
      const input = root.querySelector<HTMLElement>('[role="textbox"]');
      const r = root.getBoundingClientRect();
      const dx = r.left + r.width / 2 - (a.left + a.width / 2);
      const dy = r.top + r.height / 2 - (a.top + a.height / 2);
      return {
        input,
        hidden: getComputedStyle(root).visibility === 'hidden',
        dist: Math.hypot(dx, dy),
      };
    })
    .filter((c) => c.input);
  candidates.sort((x, y) => Number(x.hidden) - Number(y.hidden) || x.dist - y.dist);
  return candidates[0]?.input ?? null;
};

export const sendEditorToZen = (editor: any, filePath: string, withDiagnostics: boolean): void => {
  const model = editor.getModel();
  const selection = editor.getSelection();
  if (!model || !selection) return;

  const input = findZenInput(editor.getContainerDomNode());
  if (!input) return;

  const startLine: number = selection.startLineNumber;
  let endLine: number = selection.endLineNumber;
  if (endLine > startLine && selection.endColumn === 1) endLine -= 1;

  const code = Array.from({ length: endLine - startLine + 1 }, (_, i) =>
    model.getLineContent(startLine + i),
  ).join('\n');
  const fence = fenceFor(code);
  let text = `${toRelativePath(filePath)}:${startLine}-${endLine}:\n${fence}\n${code}\n${fence}\n`;

  if (withDiagnostics) {
    const markers = getStashedMarkers(model.uri.toString())
      .filter((m) => m.severity >= SEVERITY_WARNING)
      .sort((a, b) => a.startLineNumber - b.startLineNumber);
    if (markers.length > 0) {
      const items = markers.map((m) => {
        const label = m.severity >= SEVERITY_ERROR ? 'Error' : 'Warning';
        return `- ${label} (line ${m.startLineNumber}): ${m.message}\n  ${model.getLineContent(m.startLineNumber)}`;
      });
      text += `Diagnostics:\n${items.join('\n')}\n`;
    }
  }

  input.dispatchEvent(new CustomEvent(ZEN_INSERT_TEXT_EVENT, { detail: text }));
};
