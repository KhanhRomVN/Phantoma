// ── Components ──
import CodeBlock, { CodeBlockRef } from '@renderer/components/common/CodeBlock';

interface BodyTabProps {
  code: string;
  onChange: (newBody: string) => void;
  codeBlockRef?: React.RefObject<CodeBlockRef | null>;
  readOnly?: boolean;
}

export function BodyTab({ code, onChange, codeBlockRef, readOnly = false }: BodyTabProps) {
  return (
    <div className="h-full p-2 flex flex-col">
      <div className="flex items-center justify-between mb-1 shrink-0">
        <span className="text-[10px] text-text-secondary">Body</span>
        {!readOnly && (
          <button
            onClick={() => codeBlockRef?.current?.format()}
            className="text-[10px] text-text-secondary hover:text-text-primary transition-colors"
          >
            Format
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <CodeBlock
          ref={codeBlockRef}
          code={code}
          onChange={(newBody) => {
            if (readOnly) return;
            onChange(newBody);
          }}
          language="json"
          className="h-full"
          showLineNumbers
          wordWrap="on"
        />
      </div>
    </div>
  );
}
