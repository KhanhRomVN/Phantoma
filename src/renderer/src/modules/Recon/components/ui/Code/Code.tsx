import CodeBlock from '@renderer/components/common/CodeBlock';

interface Props {
  content: string;
  language?: string;
}

export default function Code({ content, language = 'plaintext' }: Props) {
  if (!content.trim()) return <div className="text-text-secondary italic p-2">Rỗng.</div>;

  return (
    <div className="h-full w-full">
      <CodeBlock code={content} language={language} />
    </div>
  );
}