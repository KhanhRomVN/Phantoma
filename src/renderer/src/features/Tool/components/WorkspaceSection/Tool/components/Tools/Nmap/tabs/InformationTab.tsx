import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NMAP_DOC } from '../constants';

interface InformationTabProps {
  accentColor: string;
}

const InformationTab: React.FC<InformationTabProps> = ({ accentColor }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          padding: '12px 16px',
          background: '#0d1117',
          borderRadius: 6,
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }: { children?: React.ReactNode }) => (
              <h1
                style={{
                  fontSize: 16,
                  color: accentColor,
                  marginBottom: 12,
                  letterSpacing: '0.1em',
                }}
              >
                {children}
              </h1>
            ),
            h2: ({ children }: { children?: React.ReactNode }) => (
              <h2 style={{ fontSize: 14, color: accentColor, marginTop: 16, marginBottom: 8 }}>
                {children}
              </h2>
            ),
            h3: ({ children }: { children?: React.ReactNode }) => (
              <h3 style={{ fontSize: 13, color: accentColor, marginBottom: 8 }}>{children}</h3>
            ),
            p: ({ children }: { children?: React.ReactNode }) => (
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>
                {children}
              </p>
            ),
            ul: ({ children }: { children?: React.ReactNode }) => (
              <ul style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0', paddingLeft: 20 }}>
                {children}
              </ul>
            ),
            li: ({ children }: { children?: React.ReactNode }) => (
              <li style={{ marginBottom: 4 }}>{children}</li>
            ),
            code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
              const isBlock = className?.includes('language');
              return isBlock ? (
                <pre
                  style={{
                    fontSize: 11,
                    color: '#cbd5e1',
                    background: '#080b10',
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
                    fontSize: 11,
                    color: accentColor,
                    background: '#080b10',
                    padding: '2px 4px',
                    borderRadius: 3,
                  }}
                >
                  {children}
                </code>
              );
            },
            table: ({ children }: { children?: React.ReactNode }) => (
              <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  {children}
                </table>
              </div>
            ),
            th: ({ children }: { children?: React.ReactNode }) => (
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  color: accentColor,
                  borderBottom: `1px solid ${accentColor}30`,
                  backgroundColor: `${accentColor}10`,
                }}
              >
                {children}
              </th>
            ),
            td: ({ children }: { children?: React.ReactNode }) => (
              <td
                style={{ padding: '6px 8px', color: '#94a3b8', borderBottom: '1px solid #1a2236' }}
              >
                {children}
              </td>
            ),
          }}
        >
          {NMAP_DOC}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default InformationTab;