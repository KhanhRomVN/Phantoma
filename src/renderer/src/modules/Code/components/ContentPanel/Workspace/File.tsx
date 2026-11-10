import { memo, useCallback, useEffect, useRef, useState } from 'react';
import CodeBlock from '@renderer/components/common/CodeBlock';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { FileBreadcrumb } from './FileBreadcrumb';

interface CodeFileProps {
  filePath?: string;
  fileId?: string;
  cwd?: string;
}

export const CodeFile = memo(function CodeFile({ filePath, fileId, cwd }: CodeFileProps) {
  const [code, setCode] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const markFileAsSaved = useCodeStore((s) => s.markFileAsSaved);
  const setOriginalContent = useCodeStore((s) => s.setOriginalContent);
  const reveal = useCodeStore((s) =>
    s.fileReveal && s.fileReveal.filePath === filePath ? s.fileReveal : null,
  );
  const clearFileReveal = useCodeStore((s) => s.clearFileReveal);

  useEffect(() => {
    if (!filePath) {
      setCode('');
      return;
    }
    let cancelled = false;
    setCode(null);
    window.api
      .invoke('fs:read-file', filePath)
      .then((content: string) => {
        if (!cancelled) setCode(content ?? '');
      })
      .catch(() => {
        if (!cancelled) setCode('');
      });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  const handleSaveTemp = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const result = await window.api.invoke('dialog:show-save', {
        defaultPath: cwd ? `${cwd}/Untitled.md` : 'Untitled.md',
      });
      if (!result || result.canceled || !result.filePath) return;
      const content: string = editorRef.current?.getValue() ?? '';
      await window.api.invoke('fs:write-file', result.filePath, content);
      if (fileId) {
        markFileAsSaved(fileId);
        setOriginalContent(fileId, content);
      }
      window.dispatchEvent(
        new CustomEvent('code:temp-file-saved', { detail: { fileId, filePath: result.filePath } }),
      );
    } catch (err) {
      console.error('[CodeFile] Save temp file failed:', err);
    } finally {
      savingRef.current = false;
    }
  }, [cwd, fileId, markFileAsSaved, setOriginalContent]);

  useEffect(() => {
    if (filePath || !fileId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey || e.key.toLowerCase() !== 's') return;
      const el = containerRef.current;
      if (!el || !editorRef.current) return;
      if (getComputedStyle(el).visibility === 'hidden' || el.offsetParent === null) return;
      const active = document.activeElement;
      if (active && active !== document.body && !el.contains(active)) return;
      e.preventDefault();
      e.stopPropagation();
      void handleSaveTemp();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [filePath, fileId, handleSaveTemp]);

  const handleEditorMounted = useCallback(
    (editor: any) => {
      editorRef.current = editor;
      if (!filePath) return;
      editor.onKeyDown(() => {});
    },
    [filePath],
  );

  const body =
    code === null ? (
      <div className="flex-1 min-h-0 flex items-center justify-center text-text-secondary/40 text-sm">
        Loading...
      </div>
    ) : (
      <div ref={containerRef} className="flex-1 min-h-0">
        <CodeBlock
          code={code}
          language={filePath ? filePath.split('.').pop() : 'markdown'}
          filePath={filePath}
          fileId={fileId}
          showLineNumbers
          hideDiagnostics
          revealPosition={reveal}
          onRevealed={clearFileReveal}
          onEditorMounted={handleEditorMounted}
        />
      </div>
    );

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col">
      {filePath && <FileBreadcrumb filePath={filePath} />}
      {body}
    </div>
  );
});