import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownBlockProps {
  content: string;
  accentColor?: string;
}

const MarkdownBlock: React.FC<MarkdownBlockProps> = ({
  content,
  accentColor = 'rgb(var(--primary))',
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'rgb(var(--text-primary))',
                  marginBottom: 12,
                  letterSpacing: '0.1em',
                }}
              >
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'rgb(var(--text-primary))',
                  marginTop: 16,
                  marginBottom: 8,
                }}
              >
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'rgb(var(--text-primary))',
                  marginBottom: 8,
                }}
              >
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p
                style={{
                  fontSize: 15,
                  color: 'rgb(var(--text-secondary))',
                  lineHeight: 1.6,
                  marginBottom: 12,
                }}
              >
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul
                style={{
                  fontSize: 15,
                  color: 'rgb(var(--text-secondary))',
                  margin: '8px 0',
                  paddingLeft: 20,
                  listStyleType: 'disc',
                }}
              >
                {children}
              </ul>
            ),
            li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
            code: ({ children, className }) => {
              const isBlock = className?.includes('language');
              return isBlock ? (
                <pre
                  style={{
                    fontSize: 14,
                    color: 'rgb(var(--text-primary))',
                    background: 'rgb(var(--input-background))',
                    padding: 12,
                    borderRadius: 4,
                    overflowX: 'auto',
                    margin: '12px 0',
                  }}
                >
                  <code>{children}</code>
                </pre>
              ) : (
                <code
                  style={{
                    fontSize: 14,
                    color: accentColor,
                    padding: '2px 4px',
                    borderRadius: 3,
                  }}
                >
                  {children}
                </code>
              );
            },
            table: ({ children }) => (
              <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  color: 'rgb(var(--text-primary))',
                  borderBottom: `1px solid ${accentColor}30`,
                }}
              >
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td
                style={{
                  padding: '6px 8px',
                  color: 'rgb(var(--text-primary))',
                  borderBottom: '1px solid rgb(var(--border))',
                }}
              >
                {children}
              </td>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownBlock;
