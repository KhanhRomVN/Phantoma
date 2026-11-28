import { useRef, useEffect } from 'react';
import { File, Folder } from 'lucide-react';
import { toastService } from '@renderer/components/ui/Toast';
import { codeApi } from '../../../shared/api/code.api';

// ─── InlineNewInput ─────────────────────────────────────────────────────────
export interface InlineNewInputProps {
  type: 'file' | 'folder';
  parentPath: string;
  depth: number;
  onCreated: () => void;
  onCancel: () => void;
}

export function InlineNewInput({ type, parentPath, depth, onCreated, onCancel }: InlineNewInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = async () => {
    const name = inputRef.current?.value.trim();
    if (!name) {
      onCancel();
      return;
    }
    try {
      const fullPath = `${parentPath}/${name}`;
      if (type === 'file') {
        await codeApi.fs.writeFile(fullPath, '');
      } else {
        await codeApi.fs.mkdir(fullPath);
      }
      onCreated();
    } catch (err) {
      console.error(`[FileExplorer] Failed to create ${type}:`, err);
      toastService.show({
        variant: 'error',
        title: type === 'file' ? 'Create file failed' : 'Create folder failed',
        description: String((err as Error)?.message ?? err).split('\n')[0],
      });
      onCancel();
    }
  };

  return (
    <div
      className="flex items-center gap-1.5 w-full py-1 pr-2"
      style={{ paddingLeft: `${8 + depth * 12 + 20}px` }}
    >
      {type === 'folder' ? (
        <Folder className="w-4 h-4 shrink-0 text-text-secondary" strokeWidth={1.5} />
      ) : (
        <File className="w-4 h-4 shrink-0 text-text-secondary" strokeWidth={1.5} />
      )}
      <input
        ref={inputRef}
        className="flex-1 bg-input-background text-[13px] text-text-primary outline-none border border-primary/50 rounded px-1.5 py-0.5"
        placeholder={type === 'folder' ? 'Folder name...' : 'File name...'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={handleSubmit}
      />
    </div>
  );
}
