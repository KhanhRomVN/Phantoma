import MarkdownBlock from '@renderer/components/common/MarkdownBlock';

interface Props {
  content: string;
}

export default function Markdown({ content }: Props) {
  if (!content.trim()) return <div className="text-text-secondary italic p-2">Rỗng.</div>;

  return (
    <div className="h-full w-full overflow-auto p-3">
      <MarkdownBlock content={content} />
    </div>
  );
}