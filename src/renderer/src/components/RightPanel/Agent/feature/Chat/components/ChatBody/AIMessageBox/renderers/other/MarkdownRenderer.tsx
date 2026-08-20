import React from 'react';

// Components
import MarkdownBlock from '../../blocks/other/MarkdownBlock';

interface MarkdownRendererProps {
  content: string;
  knownFilePaths?: Map<string, string>;
  className?: string;
}

/**
 * Renderer cho block nội dung markdown
 * Bọc MarkdownBlock với style chuẩn
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  knownFilePaths,
  className,
}) => {
  return (
    <div className="pt-1 text-xs text-text-primary">
      <MarkdownBlock content={content} knownFilePaths={knownFilePaths} className={className} />
    </div>
  );
};
