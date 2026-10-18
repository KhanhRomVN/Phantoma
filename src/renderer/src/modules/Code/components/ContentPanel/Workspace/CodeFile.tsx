import { memo, useEffect, useState } from 'react';
import CodeBlock from '@renderer/components/common/CodeBlock';
import { useCodeStore } from '../../../hooks/useCodeStore';

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

  if (code === null) {
    return (
      <div className="flex-1 h-full flex items-center justify-center text-text-secondary/40 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 h-full min-h-0">
      <CodeBlock
        code={code}
        language={filePath?.split('.').pop()}
        filePath={filePath}
        fileId={fileId}
        showLineNumbers
        revealPosition={reveal}
        onRevealed={clearFileReveal}
      />
    </div>
  );
});