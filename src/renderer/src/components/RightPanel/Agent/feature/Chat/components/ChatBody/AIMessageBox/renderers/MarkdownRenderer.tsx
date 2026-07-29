import React from "react";

// COMPONENTS
import MarkdownBlock from "../blocks/MarkdownBlock";

interface MarkdownRendererProps {
  content: string;
  knownFilePaths?: Map<string, string>;
  className?: string;
}

/**
 * Renderer for markdown content blocks
 * Wraps MarkdownBlock with standard styling
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  knownFilePaths,
  className,
}) => {
  return (
    <div
      className="pt-1 text-xs text-text-primary"
    >
      <MarkdownBlock
        content={content}
        knownFilePaths={knownFilePaths}
        className={className}
      />
    </div>
  );
};
