import { memo, useCallback, useEffect, useState } from 'react';
import CodeBlock from '@renderer/components/common/CodeBlock';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { FileBreadcrumb } from './FileBreadcrumb';
import { sendEditorToZen } from './sendToZen';

interface CodeFileProps {
  filePath?: string;
  fileId?: string;
}

export const CodeFile = memo(function CodeFile({ filePath, fileId }: CodeFileProps) {
  const [code, setCode] = useState<string | null>(null);
  const reveal = useCodeStore((s) =>
    s.fileReveal && s.fileReveal.filePath === filePath ? s.fileReveal : null,
  );
  const clearFileReveal = useCodeStore((s) => s.clearFileReveal);

  useEffect(() => {
    if (!filePath) return;
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

  const handleEditorMounted = useCallback(
    (editor: any) => {
      if (!filePath) return;
      const { KeyMod, KeyCode } = window.monaco;
      const idC = editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyC, () => {
        sendEditorToZen(editor, filePath, false);
      });
      editor.onKeyDown((e: any) => {
        if (e.ctrlKey && e.shiftKey) console.log(`[DEBUG] keydown ctrl+shift code=${e.code}`);
      });
    },
    [filePath],
  );

  const body =
    code === null ? (
      <div className="flex-1 min-h-0 flex items-center justify-center text-text-secondary/40 text-sm">
        Loading...
      </div>
    ) : (
      <div className="flex-1 min-h-0">
        <CodeBlock
          code={code}
          language={filePath?.split('.').pop()}
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
