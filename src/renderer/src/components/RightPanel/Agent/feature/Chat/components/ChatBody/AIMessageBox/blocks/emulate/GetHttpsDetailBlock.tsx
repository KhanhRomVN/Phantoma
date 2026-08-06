import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';

interface GetHttpsDetailBlockProps {
  content: string;
  maxHeight?: string;
}

interface ParsedDetail {
  requestIndex: string;
  method: string;
  url: string;
  reqHeaders: string;
  reqBody: string;
  status: string;
  resHeaders: string;
  resBody: string;
}

function parseContent(content: string): ParsedDetail {
  const result: ParsedDetail = {
    requestIndex: '',
    method: '',
    url: '',
    reqHeaders: '',
    reqBody: '',
    status: '',
    resHeaders: '',
    resBody: '',
  };

  const lines = content.split('\n');

  // Extract request index
  const headerMatch = content.match(/Request #(\d+)/);
  if (headerMatch) result.requestIndex = headerMatch[1];

  let section: 'req' | 'res' | 'none' = 'none';
  let subSection: string = '';

  for (const line of lines) {
    if (line.startsWith('--- Request ---')) {
      section = 'req';
      subSection = '';
      continue;
    }
    if (line.startsWith('--- Response ---')) {
      section = 'res';
      subSection = '';
      continue;
    }

    if (section === 'req') {
      if (line.startsWith('Method:')) {
        result.method = line.replace('Method:', '').trim();
        continue;
      }
      if (line.startsWith('URL:')) {
        result.url = line.replace('URL:', '').trim();
        continue;
      }
      if (line.startsWith('Headers:')) {
        subSection = 'reqHeaders';
        continue;
      }
      if (line.startsWith('Body:')) {
        subSection = 'reqBody';
        continue;
      }
      if (subSection === 'reqHeaders') result.reqHeaders += line + '\n';
      else if (subSection === 'reqBody') result.reqBody += line + '\n';
    }

    if (section === 'res') {
      if (line.startsWith('Status:')) {
        result.status = line.replace('Status:', '').trim();
        continue;
      }
      if (line.startsWith('Headers:')) {
        subSection = 'resHeaders';
        continue;
      }
      if (line.startsWith('Body:')) {
        subSection = 'resBody';
        continue;
      }
      if (subSection === 'resHeaders') result.resHeaders += line + '\n';
      else if (subSection === 'resBody') result.resBody += line + '\n';
    }
  }

  return result;
}

function tryFormatJson(text: string): string {
  try {
    const parsed = JSON.parse(text.trim());
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text.trim();
  }
}

function CollapsibleSection({
  title,
  content,
  defaultOpen = false,
  maxHeight = '300px',
}: {
  title: string;
  content: string;
  defaultOpen?: boolean;
  maxHeight?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  if (!content.trim()) return null;

  const formatted = tryFormatJson(content);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-card-background/50 transition-colors"
      >
        <span className="flex items-center gap-1">
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {title}
        </span>
        {open && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-sidebar-item-hover transition-colors"
            title="Copy"
          >
            {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </button>
      {open && (
        <div className="overflow-auto border-t border-border" style={{ maxHeight }}>
          <pre className="p-3 text-[12px] font-mono text-text-primary whitespace-pre-wrap break-all m-0">
            {formatted}
          </pre>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const code = parseInt(status) || 0;
  let color = 'text-text-secondary';
  if (code >= 200 && code < 300) color = 'text-success';
  else if (code >= 300 && code < 400) color = 'text-warn';
  else if (code >= 400) color = 'text-error';

  return <span className={cn('text-[11px] font-bold font-mono', color)}>{status || 'N/A'}</span>;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'text-success',
    POST: 'text-warn',
    PUT: 'text-primary',
    PATCH: 'text-primary',
    DELETE: 'text-error',
    OPTIONS: 'text-text-secondary',
    HEAD: 'text-text-secondary',
  };
  return (
    <span
      className={cn(
        'text-[11px] font-bold font-mono',
        colors[method.toUpperCase()] || 'text-text-primary',
      )}
    >
      {method.toUpperCase()}
    </span>
  );
}

export const GetHttpsDetailBlock: React.FC<GetHttpsDetailBlockProps> = ({ content }) => {
  const parsed = parseContent(content);

  if (!parsed.method && !parsed.url) {
    return (
      <div className="mt-1 bg-background border rounded-[4px] overflow-hidden ml-[29px] p-3">
        <pre className="text-[12px] font-mono text-text-secondary whitespace-pre-wrap break-all">
          {content || 'No data available.'}
        </pre>
      </div>
    );
  }

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden ml-[29px]">
      {/* Header */}
      <div className="px-3 py-2 bg-card-background border-b border-border flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-text-secondary opacity-60 font-mono">
          #{parsed.requestIndex}
        </span>
        <MethodBadge method={parsed.method} />
        <span
          className="text-[11px] text-text-primary font-mono truncate max-w-[400px]"
          title={parsed.url}
        >
          {parsed.url}
        </span>
        {parsed.status && (
          <>
            <span className="text-text-secondary opacity-40">→</span>
            <StatusBadge status={parsed.status} />
          </>
        )}
      </div>

      {/* Request */}
      <div>
        <div className="px-3 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wide bg-card-background/50">
          Request
        </div>
        <CollapsibleSection title="Headers" content={parsed.reqHeaders} />
        <CollapsibleSection title="Body" content={parsed.reqBody} />
      </div>

      {/* Response */}
      <div>
        <div className="px-3 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wide bg-card-background/50 border-t border-border">
          Response
        </div>
        <CollapsibleSection title="Headers" content={parsed.resHeaders} />
        <CollapsibleSection title="Body" content={parsed.resBody} defaultOpen={true} />
      </div>
    </div>
  );
};

export default GetHttpsDetailBlock;
