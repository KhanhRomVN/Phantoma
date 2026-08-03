import { CodeBlock, CodeBlockRef } from '../../../../../../../components/common/CodeBlock';

interface BodyTabProps {
  code: string;
  onChange: (newBody: string) => void;
  codeBlockRef?: React.RefObject<CodeBlockRef | null>;
  readOnly?: boolean;
}

export function BodyTab({ code, onChange, codeBlockRef, readOnly = false }: BodyTabProps) {
  return (
    <div className="h-full p-2 flex flex-col">
      <div className="flex-1 min-h-0">
        <CodeBlock
          ref={codeBlockRef}
          code={code}
          onChange={(newBody) => {
            if (readOnly) return;
            onChange(newBody);
            // Auto-format on change using the CodeBlock's format method
            setTimeout(() => codeBlockRef?.current?.format(), 100);
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